const { JWT } = require('google-auth-library');

// Ye values aapke diye huye Service Account JSON se hain
const serviceAccount = {
  client_email: "firebase-adminsdk-fbsvc@a-comp-hdfc-apcd006.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGsjfKkq5WEeEf\nxT/L68ads5Ry3F94lFJs5e/p7aBP8DKEhSwMp2ufjc7WOC3coR7aM2eT2OXyQhq4\nRQf3kVYwEWAEwmYRLgy/3SJ4lWdD4jbtrbZnEx9l9q4ENISqWHygtK8cM6qsCFDu\nfus2oHVYDG8et1MFrkGDUOa1XTh/RSI5jHrGBaMpcOzakc4bmrxX63Bmu5AOgyn1\nTpqtKEVMBuz0jyQR4i6LPTl+I73hjN5+0swr5pC7yv8HWtaRsEk+nLW5UZ6PUT9U\nNu6kGyFzsMW0Fxzd7wdcK22kw2TJak1ftGitzhxk9RIok9KsdpQAkQiBGimKEbsL\n4gvggwpPAgMBAAECggEAEacawtIWUApFnHt7SAQ6AJ/IRA4lI0LWMduZ3YghkoiO\nDG0CdVtYefPw2OJj3LKp2Yvwm1eNUmEiG5Xyd8G/TQT2KWYWCFe1hURBwEHRy1up\nMqOYzX6K7xWj7za1RKcY53Q2DITgmGkiu5WmExPdaQWtx6ZU52/MXTzOSnWuQ8w5\nwiI0FvfVgaCPruX2n/VoMpewr/hDhzXaHw8sNtoR1Dpea6fMTgU8feK3UZaSTsTx\nc9161gqGlHibpOw6dVl63AZY7vFZqd5JMHU3Q9M9JuSw7oFeohhYp1z14AecO+Bo\nHFgE8kKgsvsKm+384nlsBuArXb2qoBAu66shO6Ip6QKBgQD8d0dMPpwIPMpo69z3\n8thfV3ZWGTL+nXiCle0qK3wOkbFDs3CRIRCVl4oBgSWXxYx2ajG41dJHKWRXzZ5k\nGREQX6IckmTMT6V2DwCo7RT2pBaVg6afaxYSedAPh/8WxH6Xwa/axL9u9AWG/msq\nBb/Hh/pg4lzrc2Cyk1pCoT4EZwKBgQDJekDc9kHynnk3H4w1rodO6QcbJzfSeG7z\nZWQnRx4gElOcMetJrVO35k2JAbld0rJrsb/jR2wVvAeiece64ctsEiA21Ai8Yyep\nZ8CmWnj9MGGhxTCTzr187pjHkYt3IRj/E2IJxrGOcHxHemq/+kKz7JZ34B4FRc+c\n9IQkI1rZ2QKBgQDe7EOcYzxLWcIwWvPGTDwaE5R9+co5YLpkNBYyQitMggDQEsW2\noEeQjzpgkbSsCtc4SBSXbNY716SukvTk1e1nU8pFCE7QyRME58JhZtY34jO+2Xxr\nD5dxwPWigScQ53gQcAnjVg7i3b1zsXrWpDTu7nZ6zeXWUQ51H/93DgFAyQKBgQCM\niu88M7wFFm7P+P3BZKGWdg8y7cSO2NvshUm77GwjSyVvy5KprnK70bc8XyuDOzqi\nzTdhv6yx7JwWxoSA5IkWNf6qwHXnk/NSxMEqSeokE9/HDNq6AHlF8No6PFjhHQFm\nzYqR7zxkdCr9YXOdv2FQSTUdIgVPAEe24Qpcex0g4QKBgHtHXMuhBf/EsiKsmxCp\nAAtSvPrmTl8OHyQ05J2HLBxG+RKh4/T+ihBmn8zScJdMpR8jJMNu4PfkszZwP+fR\nuDA0vRWFVcVQ29Y53+HDlvg8wzBSFkqcx1d+iegfiVSlSbLKX2TJaenccMbuES4Z\nVifm4Uin97vaOOQr+kqMlfD3\n-----END PRIVATE KEY-----\n"
};

async function getAccessToken() {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  try {
    const tokens = await client.authorize();
    console.log('\n--- AAPKA NAYA FCM ACCESS TOKEN ---');
    console.log(tokens.access_token);
    console.log('------------------------------------\n');
    console.log('Is token ko copy karein aur script.js mein FCM_ACCESS_TOKEN ki jagah paste karein.');
    console.log('Yaad rahe: Ye token 1 ghante baad expire ho jayega.');
  } catch (error) {
    console.error('Error fetching access token:', error);
  }
}

getAccessToken();