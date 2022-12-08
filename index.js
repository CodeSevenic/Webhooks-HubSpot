require('dotenv').config();
const http = require('https');
const express = require('express');
const cors = require('cors');
const axios = require('axios').default;
const serverless = require('serverless-http');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: true }));

// Webhook Events listener
app.get('/', (req, res) =>
  res.send(`
  <html>
    <head><title>Success!</title></head>
    <body>
      <h1>You did it!</h1>
      <img src="https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" alt="Cool kid doing thumbs up" />
    </body>
  </html>
`)
);

const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
};

// Accelo Trigger => Notify HubSpot Custom Events
app.post('/accelo', (request, response) => {
  axios
    .post(
      'https://api.hubspot.com/events/v3/send',
      {
        email: 'sibusiso@mo.agency',
        eventName: 'pe2896934_accelo_ii',
        properties: {
          hs_city: 'Cambridge',
          hs_country: 'United States',
          hs_region: 'Nkangala',
        },
      },
      { headers: headers }
    )
    .then(function (response) {
      // console.log(response);
    });
});

// Github Stars => Notify Discord and HubSpot Custom Events
app.post('/github', async (event, context) => {
  // Notify Discord
  const content = `Repo Name: ${event.body.repository.name} and User: ${event.body.repository.owner.login}`;
  const avatarUrl = event.body.sender.avatar_url;
  try {
    const res = await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: content,
      embeds: [
        {
          image: {
            url: avatarUrl,
          },
        },
      ],
    });

    console.log('Success!');
    res.status(204).send();
  } catch (err) {
    console.error(`Error sending to Discord: ${err}`);
  }

  // Notify HubSpot Custom Event
  try {
    const res = await axios.post(
      'https://api.hubspot.com/events/v3/send',
      {
        email: 'sibusiso@mo.agency',
        eventName: 'pe2896934_github_stars',
        properties: {
          user: `${event.body.repository.owner.login}`,
          avatar: `${event.body.sender.avatar_url}`,
          repository: `${event.body.repository.name}`,
          hs_city: 'Emalahleni',
          hs_country: 'South Africa',
          hs_region: 'Nkangala',
        },
      },
      { headers: headers }
    );

    // console.log(res);
  } catch (error) {
    console.error(`Error sending to HubSpot: ${err}`);
  }
});

// People Solved => Notify Discord and HubSpot Custom Events
app.post('/peoplesolved', async (event, context) => {
  const nameAndSurname = event.body.Value.ResumeData.ContactInformation.CandidateName.FormattedName;
  const emailAddress = event.body.Value.ResumeData.ContactInformation.EmailAddresses[0];
  const phoneNumber = event.body.Value.ResumeData.ContactInformation.Telephones[0].Raw;

  // // Notify HubSpot Custom Event
  try {
    if (nameAndSurname || emailAddress || phoneNumber) {
      const res = await axios.post(
        'https://api.hubspot.com/events/v3/send',
        {
          email: 'sibusiso@mo.agency',
          eventName: 'pe2896934_github_stars',
          properties: {
            user: `${event.body.repository.owner.login}`,
            avatar: `${event.body.sender.avatar_url}`,
            repository: `${event.body.repository.name}`,
            hs_city: 'Emalahleni',
            hs_country: 'South Africa',
            hs_region: 'Nkangala',
          },
        },
        { headers: headers }
      );
    } else {
      console.log('Details are missing! 😒');
    }
  } catch (error) {
    console.error(`Error sending to HubSpot: ${err}`);
  }
});

app.use((error, req, res, next) => {
  res.status(500);
  res.send({ error: error });
  console.error(error.stack);
  next(error);
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// To be used on netlify serverless functions
module.exports.handler = serverless(app);
