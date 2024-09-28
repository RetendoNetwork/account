// handles "account.nintendo.net/v1/api/miis" endpoints

const express = require('express');
const database = require('../../../utils/database');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.get('/miis', (req, res) => {
    const xml = xmlbuilder.create({
      'miis': {
        'mii': {
          'data': 'AwAAMGskyy2kRrFgkPCZ51i9oy9zmwAAMldjAGUAZABrAGUAQwBoAGEAdAAAAF8tIBBJAStpQxgzNEYUgRIKaA0AACkIUkhQYwBlAGQAawBlAAAAAAAAAAAAAAAAAInA',
          'id': '2627629397',
          'images': {
            'image': [
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/normal_face.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/normal_face.png',
                'type': 'standard'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/frustrated.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/frustrated.png',
                'type': 'frustrated_face'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/smile_open_mouth.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/smile_open_mouth.png',
                'type': 'happy_face'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/wink_left.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/wink_left.png',
                'type': 'like_face'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/sorrow.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/sorrow.png',
                'type': 'puzzled_face'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/surprised_open_mouth.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/surprised_open_mouth.png',
                'type': 'surprised_face'
              },
              {
                'cached_url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/body.png',
                'id': '2627629397',
                'url': 'https://pretendo-cdn.b-cdn.net/mii/1330191621/body.png',
                'type': 'whole_body'
              }
            ]
          },
          'name': 'cedkeChat',
          'pid': '1330191621',
          'primary': 'Y',
          'user_id': 'cedkeChat789'
        }
      }
    });
  
    res.set('Content-Type', 'application/xml');
    res.send(xml.end({ pretty: true }));
});

module.exports = router;