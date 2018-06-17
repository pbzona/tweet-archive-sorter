const fs = require('fs');
const stream = require('stream');
const path = require('path');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();

const tmp = file => `/tmp/${file}`;

let bucketG = '';
let keyG = '';

exports.handler = async (event) => {
  console.log(`Received event: ${JSON.stringify(event)}`);

  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  if (path.extname(key) !== '.js') {
    return `This file has already been processed: ${key}`
  }

  bucketG = bucket;
  keyG = key;
  const tempFile = '/tmp/temporary.js';

  return makeTemp(bucket, key, tempFile, tmp(key))
    .then(createExport)
    .then(validate)
    .then(sortAndWrite)
    .then(reupload)
    .then(console.log)
    .catch(console.error);
};

// Gets the tweet archive and saves to a temp file on the fs
const makeTemp = (bucketName, keyName, file, dest) => {
  return new Promise((resolve, reject) => {
    fs.writeFileSync(file, '');
    const writeStream = fs.createWriteStream(file);
    const readStream = S3.getObject({
      Bucket: bucketName,
      Key: keyName
    }).createReadStream();
    readStream.pipe(writeStream);

    writeStream.on('error', (err) => {
      writeStream.end();
      reject(err);
    });

    writeStream.on('close', () => {
      resolve({
        file,
        dest
      });
    });
  });
};

// Creates a module and returns the location for importing
const createExport = (obj) => {
  return new Promise((resolve, reject) => {
    const tweets = fs.readFileSync(obj.file).toString().replace('window.YTD.tweet.part0', 'module.exports');

    if (!tweets) {
      reject('File does not exist in ./tmp');
    }

    fs.writeFileSync(obj.file, tweets);
    resolve(obj);
  });
};

// Checks for several key props on the object to make sure it's legit
const validate = (obj) => {
  return new Promise((resolve, reject) => {
    const tweets = require(obj.file);
    const sample = tweets[0];

    const test1 = sample.hasOwnProperty('created_at');
    const test2 = sample.hasOwnProperty('full_text');
    const test3 = sample.hasOwnProperty('favorite_count');

    if (!sample || (!(test1 && test2 && test3))) {
      reject(`Hmm these don't look like tweets....`);
    }
    resolve({ ...obj, tweets });
  });
};

// Sorts the tweets and writes them to a file
const sortAndWrite = (obj) => {
  return new Promise((resolve, reject) => {
    const output = obj.dest;
    let arr = [];
    const sortDatesAsc = (a, b) => {
      if (a.created_at > b.created_at) return 1;
      if (a.created_at < b.created_at) return -1;
      return 0;
    };

    obj.tweets.forEach((tweet) => {
      arr.unshift({
        created_at: new Date(tweet.created_at),
        full_text: tweet.full_text,
        retweet_count: tweet.retweet_count,
        favorite_count: tweet.favorite_count
      });
    });

    // inject formatting functions here later, based on code below, in order to create either plaintext or html versions

    // formatting code template
    fs.writeFileSync(output, '');
    arr.sort(sortDatesAsc);
    arr.forEach((tweet) => {
      fs.appendFileSync(output, `${tweet.created_at}\n${tweet.full_text}\nRT - ${parseInt(tweet.retweet_count)} | <3 - ${parseInt(tweet.favorite_count)}\n\n`);
    });
    fs.appendFileSync(output, '');
    // end formatting code template

    resolve(obj);
  });
};

// Upload results to S3
const reupload = (obj) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(obj.dest);
    const writeStream = (success, fail) => {
      const pass = new stream.PassThrough();
      const params = {
        Body: pass,
        Key: `tweets/${keyG.split('.')[0]}.txt`,
        Bucket: bucketG,
        ContentType: `text/plain`
      };
      console.log('Uploading tweets...');
      S3.upload(params).promise()
        .then(success)
        .catch(fail);
      return pass;
    }
    readStream.pipe(writeStream(resolve, reject));
    readStream.on('close', () => {
      console.log('Done!');
    });
  });
};

const formatHTML = () => {
  // Maybe later
};

const formatText = () => {
  // Maybe later
};