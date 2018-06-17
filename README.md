# Twitter Archive Sorter

This project is the code behind a system that will parse and sort your Twitter archive into a readable plaintext format.

When you request your personal data archive from Twitter, they send you a bunch of JavaScript files for some reason. It's not especially hard to generate readable text from these if you know how to code, but you shouldn't have to have tech skills in order to read your own personal history.

## Architecture

The code in this repo is divided into the different parts of infrastructure that runs it.

First, the `app` folder contains a Python (Flask) web app that allows users to upload their `tweet.js` file to an Amazon S3 bucket. I've included a Dockerfile for a layer of security since this form accepts JS files.

Next, the `lambda` folder contains a function that is triggered by an S3 event emitted when the bucket accepts a new object. This function is where the code is parsed, sorted, and formatted, and placed into a subdirectory in the bucket called `/tweets`. This step was offloaded because the sorting and parsing is currently not very efficient, and the web app should be able to run on as small an instance as possible.

## How it All Fits Together

This project runs on AWS, which can be a complex platform. Once this part is fully fleshed out in the ways I want it to be, I'll update this section fully. The goal is to be super transparent with how everything works together - it accepts potentially personal data, so I don't think anything about that should be hidden.
