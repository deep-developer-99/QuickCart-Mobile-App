import {
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId:
    '911620422080-dt0af3rvjtut1919sv8om5cv4vf4bh4c.apps.googleusercontent.com',
});

export type GoogleSignInStage =
  | 'google_play_services'
  | 'google_session_reset'
  | 'google_account_selection'
  | 'google_id_token'
  | 'firebase_authentication'
  | 'firebase_id_token';

export const signInWithGoogle = async (
  onStage?: (stage: GoogleSignInStage) => void,
): Promise<string | null> => {
  onStage?.('google_play_services');
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  // Clear the previously selected Google Sign-In session
  // so the account picker can be shown.
  onStage?.('google_session_reset');
  await GoogleSignin.signOut();

  onStage?.('google_account_selection');
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  onStage?.('google_id_token');
  const googleIdToken = response.data.idToken;

  if (!googleIdToken) {
    throw new Error('Google ID token was not returned');
  }

  const googleCredential = GoogleAuthProvider.credential(googleIdToken);

  onStage?.('firebase_authentication');
  const firebaseUserCredential = await signInWithCredential(
    getAuth(),
    googleCredential,
  );

  onStage?.('firebase_id_token');
  const firebaseIdToken = await firebaseUserCredential.user.getIdToken();

  return firebaseIdToken;
};
