#! /usr/bin/env node

'use strict'

let _ = require('underscore');
var shows = require('./db');
let Show = require('./show');

shows
  .map((s) => new Show(s))
  .forEach((s) => s.updateHtml()
  .then(() => {
    s.parseHtml()
  }));
