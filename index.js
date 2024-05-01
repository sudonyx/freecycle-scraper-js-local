import { createRequire } from "module";
const require = createRequire(import.meta.url);
const https = require('https');
const fs = require('fs');
import { parse } from 'node-html-parser';
const searchData = require('./search.json');

const searchTown = searchData['searchTown'];
const searchItem = searchData['searchItem'].toLowerCase();

const options = {
  hostname: 'www.freecycle.org',
  port: 443,
  path: `/town/${searchTown}`,
  method: 'GET',
}

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const root = parse(data)
    const fcData = JSON.parse(root.querySelector('fc-data').attributes[':data']);

    let posts = {};

    fcData['posts'].forEach(post => {
      if (post['type']['name'] === 'OFFER') {
        if (!searchItem) {
          posts[post['id']] = {
            'Item' : post['subject'],
            'Description' : post['description']
          }
        } else {
          if (post['subject'].toLowerCase().includes(searchItem)) {
            posts[post['id']] = {
              'Item' : post['subject'],
              'Description' : post['description']
            }
          }
        }
      }
    });

    console.log(posts);

    const jsonString = JSON.stringify(fcData, null, 2);

    fs.writeFile('./fc-data.json', jsonString, err => {
      if (err) {
          console.log('Error writing file', err)
      } else {
          console.log('Successfully wrote file')
      }
    });
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end()
