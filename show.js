'use strict'

let fs = require('fs');
let q = require('q');
let https = require('https');

var UpdateDate = new Date();
UpdateDate.setDate(UpdateDate.getDate() - 7);

let Show = function(showObj) {
  this.name = showObj.name;
  this.link = showObj.link;
  this.abbr = showObj.abbr;
};

Show.prototype.getFilename = function() {return './data/' + this.abbr + '.html'};

Show.prototype.readFileAsync = function(deferred) {
  fs.readFile(this.getFilename(), 'utf8', (error, data) => {
    if(error) {
      console.log(`- Error (${error}) while trying to read html file for show '${this.name}'`);
      deferred.reject();
    } else {
      this._html = data;
      console.log(`+ HTML file for show ${this.name} was successfully read.`);
      deferred.resolve();
    }
  });
};

Show.prototype.writeFileAsync = function(deferred) {
  fs.writeFile(this.getFilename(), this._html, (error) => {
    if(error) {
      console.log(`- Error ${error} while trying to write html file for show '${this.name}'`);
      deferred.reject();
    } else {
      console.log(`+ HTML file for show ${this.name} was successfully written.`);
      deferred.resolve();
    }
  });
};

Show.prototype.downloadHtmlAsync = function(deferred) {
  var result = "";
  https.get({
    host: 'en.wikipedia.org',
    path: '/wiki/' + this.link
  }, (res) => {
    res
      .on("data", (chunk) => result += chunk)
      .on("end", () => {
        if(res.statusCode == 200) {
          this._html = result;
          this.writeFileAsync(deferred);
        } else {
          console.log(`- Error ${res.statusCode} while trying to download html file for show '${this.name}'`);
          deferred.reject();
        }
      })
  }).on('error', (error) => {
    console.log(`- Error (${err}) while trying to download html file for show '${this.name}'`);
    deferred.reject();
  });
};

Show.prototype.updateHtml = function() {
  var deferred = q.defer();
  let stat = fs.stat(this.getFilename(), (err, stat) => {
    if(err) {
      if(err.code != "ENOENT") {
        console.log(`- Error (${err}) while trying to access html file for show '${this.name}'`);
        deferred.reject();
      } else {
        console.log(`= HTML file for show ${this.name} doesn't exist, it must be downloaded.`);
        this.downloadHtmlAsync(deferred);
      }
    } else {
      if(new Date(stat.mtime) >= UpdateDate) {
        console.log(`= HTML file for show ${this.name} is updated, it must be read.`);
        this.readFileAsync(deferred);
      } else {
        console.log(`= HTML file for show ${this.name} is at least seven days old, it must be readownloaded.`);
        this.downloadHtmlAsync(deferred);
      }
    }
  });
  return deferred.promise;
};

module.exports = Show;
