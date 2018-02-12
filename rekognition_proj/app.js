const express = require('express');
const app = express();
require('dotenv').config();

const morgan = require('morgan');
const body_parser = require('body-parser');
const fileUpload = require('express-fileupload');
const uuidv4 = require('uuid/v4');

const AWS = require('aws-sdk')
AWS.config.update({
  accessKeyId: process.env.KEY,
  secretAccessKey: process.env.SECRET,
  region: "us-east-1",
});
const s3 = new AWS.S3()
const bucket = 'rekognition-proj';
const acl = 'public-read'
const AWSParameters = {
    "accessKeyId": process.env.KEY,
    "secretAccessKey": process.env.SECRET,
    "region": "us-east-1",
    "bucket": bucket,
    "ACL": acl
}
const rekognition = new AWS.Rekognition(AWSParameters);


app.use(morgan('dev'));
app.use(body_parser.json({limit: '50mb'}));
app.use(body_parser.urlencoded({extended: true}));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));

app.set('view engine', 'hbs');
app.use('/public', express.static('public'));

app.get('/', function(req, res) {
    var context = {
      title: 'Upload Your Pictures, Match Your Faces!',
      match: req.query.match
    };
    res.render('upload.hbs', context);
  });

app.post ('/upload-pics', function (req, res) {
  let key1 = uuidv4();
  let key2 = uuidv4();
  let { picture, picture2 } = req.files

  let images = [
    {
      Bucket: bucket,
      Key:  `${key1}.png`,
      Body: picture.data,
      ACL: acl
    },
    {
      Bucket: bucket,
      Key:  `${key2}.png`,
      Body: picture2.data,
      ACL: acl
    }
  ]

  images.forEach(function(img){
    s3.upload(img, function(err, data) {
      let params = {
        SimilarityThreshold: 80,
        SourceImage: {
         S3Object: {
          Bucket: bucket,
          Name: `${key1}.png`
         }
        },
        TargetImage: {
         S3Object: {
          Bucket: bucket,
          Name: `${key2}.png`
         }
        }
       };

      rekognition.compareFaces(params, function(err, data) {
        var match = ''
       if (err) console.log(err, err.stack);
       else     console.log(data.FaceMatches.length);
        if(data.FaceMatches.length > 0 ) {
          match = 'positive';
        } else {
          match = 'negative';
        }
        res.redirect(`/?match=${match}`);
      });
    });
  });
});




var PORT = process.env.PORT || 8000;
app.listen(PORT, function () {
  console.log('Listening on port ' + PORT);
});
