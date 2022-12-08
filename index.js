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

const UpdateHubspotContact = async (data, id) => {
  let email = data.Value.ResumeData.ContactInformation.EmailAddresses[0];
  let first_name = data.Value.ResumeData.ContactInformation.CandidateName.GivenName;
  let last_name = data.Value.ResumeData.ContactInformation.CandidateName.FamilyName;
  let phone = data.Value.ResumeData.ContactInformation.Telephones[0].Raw;

  await axios
    .patch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${id}`,
      {
        properties: {
          email: email,
          firstname: first_name,
          lastname: last_name,
          phone: phone,
        },
      },
      {
        headers: {
          authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'content-type': 'application/json',
        },
      }
    )
    .then((res) => {
      console.log(res.data);
    });
};

const AddHubspotContact = async (data) => {
  let email = data.Value.ResumeData.ContactInformation.EmailAddresses[0];
  let first_name = data.Value.ResumeData.ContactInformation.CandidateName.GivenName;
  let last_name = data.Value.ResumeData.ContactInformation.CandidateName.FamilyName;
  let phone = data.Value.ResumeData.ContactInformation.Telephones[0].Raw;

  const res = await axios.post(
    'https://api.hubapi.com/crm/v3/objects/contacts',
    {
      properties: {
        email: email,
        firstname: first_name,
        lastname: last_name,
        phone: phone,
      },
    },
    {
      headers: {
        authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        'content-type': 'application/json',
      },
    }
  );
};

const HubspotSearch = async (data) => {
  let email = data.Value.ResumeData.ContactInformation.EmailAddresses[0];

  const res = await axios
    .get('https://api.hubapi.com/contacts/v1/search/query?q=' + email, {
      headers: {
        authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        'content-type': 'application/json',
      },
    })
    .then((res) => {
      const contactId = res.data.contacts[0].vid;

      if (res.data.total == 0) {
        AddHubspotContact(data);
      } else {
        UpdateHubspotContact(data, contactId);
      }
    });
};

// People Solved => Notify Discord and HubSpot Custom Events
app.post('/peoplesolved', async (event, context) => {
  const nameAndSurname = event.body.Value.ResumeData.ContactInformation.CandidateName.FormattedName;
  const emailAddress = event.body.Value.ResumeData.ContactInformation.EmailAddresses[0];
  const phoneNumber = event.body.Value.ResumeData.ContactInformation.Telephones[0].Raw;

  // Notify HubSpot Custom Event
  try {
    if (nameAndSurname || emailAddress || phoneNumber) {
      const res = await axios.post(
        'https://api.hubspot.com/events/v3/send',
        {
          email: `${emailAddress}`,
          eventName: 'pe2896934_submitted_cv_notification',
          properties: {
            message: `${nameAndSurname} Has submitted their resume 😊`,
            formatted_name: `${nameAndSurname}`,
            email: `${emailAddress}`,
            phone_number: `${phoneNumber}`,
          },
        },
        { headers: headers }
      );
      console.log(res.status);
      // Search and Update Contact
      HubspotSearch(event.body);
      if (res.status === 204) {
      }
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
// module.exports.handler = serverless(app);
