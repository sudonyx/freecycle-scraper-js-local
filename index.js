import { createRequire } from "module";
const require = createRequire(import.meta.url);
const https = require('https');
const fs = require('fs');
const nodemailer = require("nodemailer");
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

        // populate posts object from html data
        fcData['posts'].forEach(post => {
            if (
                post['type']['name'] === 'OFFER' && 
                post['subject'].toLowerCase().includes(searchItem)
            ) {
                posts[post['id']] = {
                'Item' : post['subject'],
                'Description' : post['description'],
                'Location' : post['location']
                }
            }
        });

        // sort object to have newest posts first, limit to ten items
        const sortedKeys = Object.keys(posts).sort().reverse().slice(0, 10);
        const sortedPosts = new Map();
        sortedKeys.forEach((key) => {
            sortedPosts.set(key, posts[key]);
        })

        // iterate over posts map and build html
        let emailHtml = `<div><h3>Search results in ${searchTown}</h3></div>`;
        for (let [postId, post] of sortedPosts) {
            emailHtml += `<div><h5>${postId}: ${post.Item}</h5><p>${post.Description}</p><p>${post.Location}</p><br></div>`;
        }

        // create SMTP transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'matilda.funk@ethereal.email',
                pass: 'QegJmC1yhFE2xKGbn3'
            }
        });

        // configure email and send
        async function main() {
            const info = await transporter.sendMail({
                from: 'Matilda Funk <matilda.funk@ethereal.email>',
                to: 'jcwills369@gmail.com',
                subject: `Freecycle search for ${searchItem}`,
                html: emailHtml
            })

            console.log("Message sent: %s", info.messageId);
        }

        main().catch(console.error)
        
        // const jsonString = JSON.stringify(fcData, null, 2);

        // fs.writeFile('./fc-data.json', jsonString, err => {
        //     if (err) {
        //         console.log('Error writing file', err)
        //     } else {
        //         console.log('Successfully wrote file')
        //     }
        // });
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.end()
