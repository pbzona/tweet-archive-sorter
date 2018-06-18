import os
import boto3
import uuid
from flask import Flask, request, redirect, url_for, render_template, session
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = './tmp/'
ALLOWED_EXTENSIONS = set(['js'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024 # defines 32 MB
app.secret_key = 'P6u!LT_k;nm'  # definitely change this for prod

s3 = boto3.resource('s3')
bucket_name = 'phil-tweetarchive-bucket' # change this for prod

def allowed_file(filename):
    return filename == 'tweet.js'

def put_in_S3(file, filename):
    data = open(file, 'rb')
    s3.Bucket(bucket_name).put_object(Key=filename, Body=data)

@app.route('/', methods=['GET'])
def home():
    if 'archive_id' in session:
        session.pop('archive_id')
    return render_template('home.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            print('No file part')
            return redirect(request.url)
        file = request.files['file']
        if file.filename == '':
            print('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            identifier = uuid.uuid4()
            filename = '{}.{}'.format(identifier, file.filename.split('.')[1])
            path_to_file = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(path_to_file)
            put_in_S3(path_to_file, filename)
            os.remove(path_to_file)
            session['archive_id'] = identifier
            return redirect(url_for('upload', archive=session['archive_id']))
    return render_template('upload.html', archive=session['archive_id'])

if __name__ == '__main__':
    #app.run(debug=True)
    app.run(host='0.0.0.0', debug=True, port=80)
