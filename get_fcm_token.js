const { JWT } = require('google-auth-library');

// Ye values aapke diye huye Service Account JSON se hain
const serviceAccount = {
  "client_email": "firebase-adminsdk-fbsvc@customer-suport-sr-apcd06.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQCjGlpMjl/TrvXp\nbafYIxQADTtz5tIpem/Fn02me7gmwYnNO85BGS3qT/17wN1/LLIJXBNCW3cSNipL\nCzyW99D+0UoAdulwtaRnRDjqdmDnM07aY2BP9w7ctwWhghny3jXle3Oxt5seb8Zq\npZ9HblZ47Dw7gexi6iu/HApFNfcWwPmN3HptG5+VU7sxL9jUBeopD9CkHihxnuHH\nAh8IbmOttl6sI6Bd292Uf6riwi5wvWaC/hqWXLln+2v6UE5IToVcjmOA1Qr4fBuO\nHtCfkjID8aDvsL0sKeusESAWXYo4TvFLPGd1GtWp6fxS0kLUzMizhw10PBOoO1lQ\nnX0uJsnjAgMBAAECgf8bgIC5Z/MV6T/jRxow17lc84joLNjt0Ddd8KlR6TVOqP5o\nx4Iqd+nGGLbP/IqyEayePL2tSBRL0yuj0RaRCOMKFJWQfnyJBMKJUczxvARFoovT\n8e3LjgfI2mjt/YINRxV6HIGQSzqyEdGN1LTcK+loz8IC8WVqnbxtUne+M9tLeqRb\nMT39k+IL2J7OBsHSgiWDT1+QZlpUbiCiYrOQzABx9VdmJ7cFDS/yfze/y6AA7C6f\nZO3Ag/bk7BUi0EFk/gmtOyqh5vC4TBwtSrOsNTqdA/8aP6AC4Y1ps98TdE7PN4QC\nPfZiAZWs81WiJqVcS3lYiap+l+titaArjlLkGLkCgYEAzGzo9Aq8UlO9P0v+Yt+z\nAcOAkCNbdO+8He3ktU0uGcWpWz/3Py/Q29hJWwXd4/X+hI6RNE3mltRRJERPm9sN\nuinb0pC7ta3HyRiQnetzeEhq6lfoWNehPIM5qrQBW02/K7M8tjWcOCRw72Gtl9XQ\nEhfDeUkCZUDKs4Yf58+13JkCgYEAzECTEKqbW1jwbiaMBykcus2Zz5Ti0sNra38X\nd9vhAFEPRIPqd91juZaMUGFC77+nDDBEEeT2VYWC4Y8VG/E4TKqtkMI5hQAm/5XE\nSqLdFboTZ86rXdjyET8NH7dou68cLQcmaVdnFgTFGUss5T6Y4EawuoaZFFXfSJr1\nN8isi9sCgYAUelB3qd+li5fokE9CTlBbO99UEQanVyCMCvmfI8Ubdc56QpUc8khE\nzYzDnnnUzR6a3sEy8R7JOymJrYIgBbiBTpIjrLXxBCCAR4KtHxnpEbAMG5Q92hPf\nwPF05SVBpS8iTIknY4VrplLd1/YQwK1gMps1OhgQVoY3p5bonMkF+QKBgCLvFHgw\nRdwMzSp5y09aN8C3c4wucdEMfW3oUdI9ODF+q7bTPSH9KpZOandA+1rYE7Eg/DN3\nTq535FfByiF6U1/BfWgZ4A6gZQsnyWfejSOvLKx/i43Ekjpi51K6Yt5e59nHtEkm\nGsqITFG0KtyWpT0OuiFc7getXEAlyLUezGwrAoGAfFYtbSNOsLvUzB25LIbZY+G1\nNNxWwrA7QpZ8FSYFc0NNNzC3mMtvBdKeQAbBYbkO5Fl7LflI6aBUxQ00e/mCQp1M\npt0aIs0DijZ05wHShDEg2dT/XJcpxx3exSSKvV+I4eydvApIKlSwvDli9AJZS361\nsm+pWSPCeCBMTfexrmk=\n-----END PRIVATE KEY-----\n",
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