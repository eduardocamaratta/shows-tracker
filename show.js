'use strict'

let fs = require('fs');
let q = require('q');
let https = require('https');
let cheerio = require('cheerio');

var UpdateDate = new Date();
UpdateDate.setDate(UpdateDate.getDate() - 7);

let Show = function(showObj) {
  this.name = showObj.name;
  this.link = showObj.link;
  this.abbr = showObj.abbr;
};

Show.HTMLBaseDir = './data/';

Show.checkHtmlDir = function() {
  var deferred = q.defer();
  fs.stat(Show.HTMLBaseDir, (err, stat) => {
    if(!err) {
      deferred.resolve();
      return;
    }

    if(err.code != "ENOENT") {
      console.log(`- Error ${err} trying to access directory ${Show.HTMLBaseDir}. Unfortunately, we can't continue without access to this folder :(`);
      deferred.reject();
      process.exit(1);
    }

    fs.mkdir(Show.HTMLBaseDir, (err, stat) => {
      if(!err) {
        deferred.resolve();
        return;
      }
      console.log(`- Error ${err} trying to create directory ${Show.HTMLBaseDir}. Unfortunately, we can't continue without this folder`);
    });
  });
  return deferred.promise;
};

/*************************************************************************************************
 ** HTML Parsing **
 *************************************************************************************************/

// Header line is parsed to find the indexes of 'number', 'title' and 'date' columns (which can be different between shows)
Show.prototype._parseHeaderLine = function($, headerColumns) {
  let numberIndex = -1, titleIndex = -1, dateIndex = -1;
  for(let h = 0; h < headerColumns.length; ++h) {
    let headerText = $(headerColumns[h]).text();
    if(headerText.match(/^No\.\s+in\s+season$/i) != null || headerText.match(/^No\.$/) != null) {
      numberIndex = h;
    } else if (headerText.match(/^Title$/i)) {
      titleIndex = h;
    } else if (headerText.match(/^.*air\s+date.*$/i)) {
      dateIndex = h;
    }
  }
  return {number: numberIndex, title: titleIndex, date: dateIndex};
};

Show.prototype.parseHtml = function() {
  let $ = cheerio.load(this._html);
  // Each season is a table with the class .wikiepisodetable
  let seasons = $('.wikiepisodetable');

  console.log(`= ${this.name}: ${seasons.length} potential seasons tables found.`);
  for(var s = 0; s < seasons.length; ++s) {
    let season = $(seasons[s]);
    let allLines = season.find('tr');

    // The header is the the first line of each table, parse it to find the indexes of 'number', 'title' and 'date' columns
    let indexes = this._parseHeaderLine($, allLines.first().find('th'));
    if(indexes.number == -1 || indexes.title == -1 || indexes.date == -1) {
      let notFoundFields = [indexes.number, indexes.title, indexes.date].map((v, i) => v == -1 ? ['number', 'title', 'date'][i] : '').filter(v => v != '').join(', ');
      console.log(`= Warning: ${notFoundFields} index(es) not found for show ${this.name}, season ${s + 1}. Ignoring this season`);
      continue;
    }

    // TODO: parse episodes lines
  }

};


/*************************************************************************************************
 ** Read/Write HTML File **
 *************************************************************************************************/

Show.prototype.getFilename = function() {return Show.HTMLBaseDir + this.abbr + '.html'};

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


/*************************************************************************************************
 ** Get Remote HTML File **
 *************************************************************************************************/

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
