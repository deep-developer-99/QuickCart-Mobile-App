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

export const signInWithGoogle = async (): Promise<string | null> => {
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  // Clear the previously selected Google Sign-In session
  // so the account picker can be shown.
  await GoogleSignin.signOut();

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  const googleIdToken = response.data.idToken;

  if (!googleIdToken) {
    throw new Error('Google ID token was not returned');
  }

  const googleCredential = GoogleAuthProvider.credential(googleIdToken);

  const firebaseUserCredential = await signInWithCredential(
    getAuth(),
    googleCredential,
  );

  const firebaseIdToken = await firebaseUserCredential.user.getIdToken();

  return firebaseIdToken;
};
