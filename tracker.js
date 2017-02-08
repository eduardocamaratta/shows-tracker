#! /usr/bin/env node

'use strict'

let _ = require('underscore');
var shows = require('./db');
let Show = require('./show');

Show.checkHtmlDir().then(() => {
shows
  .map((s) => new Show(s))
  .forEach((s) => s.updateHtml()
    .then(() => {
      s.parseHtml()
    }));
});