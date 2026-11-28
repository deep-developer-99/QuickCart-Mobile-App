package com.quickcartmobile

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeVoiceSearchModule.NAME)
class NativeVoiceSearchModule(private val context: ReactApplicationContext) : NativeVoiceSearchSpec(context) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var listening = false
  private var sessionId = 0
  private var activeLanguage = "en-IN"
  private var activeRecognizerIsOnDevice = false
  private var fallbackAttempted = false

  init { log("module instance constructed") }

  override fun getName(): String {
    log("getName queried")
    return NAME
  }

  override fun initialize() {
    super.initialize()
    log("module initialize completed")
  }

  override fun isAvailable(promise: Promise) {
    // SpeechRecognizer creation and all capability checks are serialized on the UI thread.
    mainHandler.post {
      try {
        val serviceAvailable = SpeechRecognizer.isRecognitionAvailable(context)
        val onDeviceAvailable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        } else false
        log("capability check: systemRecognitionService=$serviceAvailable onDevice=$onDeviceAvailable")
        promise.resolve(serviceAvailable)
      } catch (error: Exception) {
        log("capability check failed: ${error.javaClass.simpleName}: ${error.message}")
        promise.resolve(false)
      }
    }
  }

  override fun startListening(language: String, promise: Promise) {
    mainHandler.post {
      if (listening) {
        log("start rejected: recognizer is already busy")
        promise.resolve(false)
        return@post
      }

      try {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
          log("start rejected: Android reports no RecognitionService")
          promise.resolve(false)
          return@post
        }
        activeLanguage = language.ifBlank { "en-IN" }
        fallbackAttempted = false
        val onDeviceAvailable = try {
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        } catch (error: Exception) {
          log("on-device capability probe failed; using system service: ${error.javaClass.simpleName}: ${error.message}")
          false
        }
        listening = true
        val activeSession = ++sessionId
        log("starting language=$activeLanguage preferred=${if (onDeviceAvailable) "on-device" else "system"}")
        startRecognizer(activeSession, activeLanguage, onDeviceAvailable, true, promise)
      } catch (error: Exception) {
        listening = false
        destroyRecognizer()
        log("recognition initialization failed: ${error.javaClass.simpleName}: ${error.message}")
        promise.resolve(false)
      }
    }
  }

  private fun startRecognizer(
    activeSession: Int,
    language: String,
    useOnDevice: Boolean,
    allowSystemFallback: Boolean,
    startPromise: Promise?,
  ) {
    if (activeSession != sessionId) return
    try {
      destroyRecognizer()
      val created = if (useOnDevice && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
      } else {
        SpeechRecognizer.createSpeechRecognizer(context)
      }
      recognizer = created
      activeRecognizerIsOnDevice = useOnDevice
      created.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = onMainForSession(activeSession) { emitOnSpeechStart(true) }
        override fun onRmsChanged(rmsdB: Float) = onMainForSession(activeSession) { emitOnAudioLevel(rmsdB.toDouble()) }
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = onMainForSession(activeSession) { emitOnSpeechEnd(true) }

        override fun onError(error: Int) = onMainForSession(activeSession) {
          if (activeRecognizerIsOnDevice && !fallbackAttempted && isRecoverableOnDeviceFailure(error)) {
            fallbackAttempted = true
            log("on-device recognizer failed (${errorName(error)}); retrying once with system RecognitionService")
            destroyRecognizer()
            startRecognizer(activeSession, activeLanguage, false, false, null)
          } else {
            listening = false
            log("recognizer error: ${errorName(error)} ($error), onDevice=$activeRecognizerIsOnDevice")
            emitOnRecognitionError(errorName(error))
            destroyRecognizer()
          }
        }

        override fun onResults(results: Bundle?) = onMainForSession(activeSession) {
          val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
          listening = false
          log("recognition completed; finalResultPresent=${text.isNotBlank()} onDevice=$activeRecognizerIsOnDevice")
          emitOnFinalResult(text)
          destroyRecognizer()
        }

        override fun onPartialResults(partialResults: Bundle?) = onMainForSession(activeSession) {
          val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
          if (text.isNotBlank()) emitOnPartialResult(text)
        }

        override fun onEvent(eventType: Int, params: Bundle?) = Unit
      })

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        if (useOnDevice) putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
      }
      created.startListening(intent)
      log("startListening accepted by ${if (useOnDevice) "on-device" else "system"} recognizer for $language")
      startPromise?.resolve(true)
    } catch (error: Exception) {
      log("${if (useOnDevice) "on-device" else "system"} recognizer initialization failed: ${error.javaClass.simpleName}: ${error.message}")
      destroyRecognizer()
      if (useOnDevice && allowSystemFallback && activeSession == sessionId) {
        fallbackAttempted = true
        log("falling back to standard system SpeechRecognizer")
        startRecognizer(activeSession, language, false, false, startPromise)
      } else {
        listening = false
        if (startPromise != null) startPromise.resolve(false)
        else emitOnRecognitionError("ERROR_INITIALIZATION")
      }
    }
  }

  private fun isRecoverableOnDeviceFailure(error: Int) = error == 12 || error == 13 // LANGUAGE_NOT_SUPPORTED / LANGUAGE_UNAVAILABLE

  private fun onMainForSession(activeSession: Int, callback: () -> Unit) {
    val guarded = { if (activeSession == sessionId) callback() }
    if (Looper.myLooper() == Looper.getMainLooper()) guarded() else mainHandler.post(guarded)
  }

  override fun stopListening() {
    mainHandler.post {
      try { recognizer?.stopListening() } catch (error: Exception) {
        log("stopListening failed: ${error.javaClass.simpleName}: ${error.message}")
        listening = false
        destroyRecognizer()
      }
    }
  }

  override fun cancelListening() {
    mainHandler.post {
      sessionId++
      listening = false
      try { recognizer?.cancel() } catch (error: Exception) { log("cancel failed: ${error.javaClass.simpleName}: ${error.message}") }
      destroyRecognizer()
    }
  }

  private fun destroyRecognizer() {
    try { recognizer?.setRecognitionListener(null); recognizer?.destroy() } catch (error: Exception) {
      log("recognizer cleanup failed: ${error.javaClass.simpleName}: ${error.message}")
    }
    recognizer = null
  }

  private fun errorName(error: Int) = when (error) {
    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "ERROR_NETWORK_TIMEOUT"
    SpeechRecognizer.ERROR_NETWORK -> "ERROR_NETWORK"
    SpeechRecognizer.ERROR_AUDIO -> "ERROR_AUDIO"
    SpeechRecognizer.ERROR_SERVER -> "ERROR_SERVER"
    SpeechRecognizer.ERROR_CLIENT -> "ERROR_CLIENT"
    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "ERROR_SPEECH_TIMEOUT"
    SpeechRecognizer.ERROR_NO_MATCH -> "ERROR_NO_MATCH"
    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "ERROR_RECOGNIZER_BUSY"
    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "ERROR_INSUFFICIENT_PERMISSIONS"
    12 -> "ERROR_LANGUAGE_NOT_SUPPORTED"
    13 -> "ERROR_LANGUAGE_UNAVAILABLE"
    else -> "ERROR_UNKNOWN"
  }

  private fun log(message: String) {
    if (BuildConfig.DEBUG) Log.i(TAG, message)
  }

  override fun invalidate() {
    mainHandler.post { sessionId++; listening = false; destroyRecognizer() }
    super.invalidate()
  }

  companion object {
    const val NAME = "NativeVoiceSearch"
    private const val TAG = "QuickCartVoiceSearch"
  }
}
