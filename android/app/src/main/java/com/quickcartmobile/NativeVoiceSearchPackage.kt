package com.quickcartmobile

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import android.util.Log

/** A BaseReactPackage is required for explicit registration with bridgeless TurboModule lookup. */
class NativeVoiceSearchPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (BuildConfig.DEBUG) Log.i(TAG, "getModule requested name=$name")
    if (name != NativeVoiceSearchModule.NAME) return null
    val module = NativeVoiceSearchModule(reactContext)
    if (BuildConfig.DEBUG) Log.i(TAG, "created ${module.javaClass.name}; isTurboModule=${module is TurboModule}")
    return module
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    if (BuildConfig.DEBUG) Log.i(TAG, "providing TurboModule metadata for ${NativeVoiceSearchModule.NAME}")
    return ReactModuleInfoProvider {
      mapOf(
      NativeVoiceSearchModule.NAME to ReactModuleInfo(
        NativeVoiceSearchModule.NAME,
        NativeVoiceSearchModule::class.java.name,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        true, // isTurboModule
      ),
      )
    }
  }

  companion object { private const val TAG = "QuickCartVoiceSearch" }
}
