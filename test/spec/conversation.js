'use strict';

require('../mockwebrtc')();

var assert = require('assert');
var Q = require('q');
var util = require('./util');

var Endpoint = require('../../lib/endpoint');
var SIPJSUserAgent = require('../../lib/signaling/sipjsuseragent');

var config = require('../../test');
var accountSid = config['accountSid'];
var accountSid = config['accountSid'];
var signingKeySid = config['signingKeySid'];
var signingKeySecret = config['signingKeySecret'];
var wsServer = config['wsServer'];
var getToken = require('../token').getToken.bind(null, accountSid,
  signingKeySid, signingKeySecret);

var Token = require('../../lib/scopedauthenticationtoken');

describe('Conversation (SIPJSUserAgent)', function() {
  // Alice is an Endpoint.
  var aliceName = randomName();
  var aliceToken = getToken(aliceName);
  var alice = null;

  // Bob is a UserAgent.
  var bobName = randomName();
  var bobToken = getToken(bobName);
  var bob = null;

  // Charlie is a UserAgent.
  var charlieName = randomName();
  var charlieToken = getToken(charlieName);
  var charlie = null;

  // Donald is a UserAgent.
  var donaldName = randomName();
  var donaldToken = getToken(donaldName);
  var donald = null;

  var conversation = null;
  var dialog = null;

  var options = {};
  options['debug'] = false;
  options['wsServer'] = wsServer;
  options['logLevel'] = 'off';

  before(function setupConversaton(done) {
    this.timeout(0);
    alice = new Endpoint(aliceToken, options);
    bob = new SIPJSUserAgent(bobToken, options);
    bob.connect().then(function() {
      return Q.all([alice.listen(), bob.register()]).then(function() {
        bob.on('invite', function(ist) {
          ist.accept().then(function(_dialog) {
            dialog = _dialog;
          });
        });
        return alice.createConversation(bobName);
      });
    }).then(function(_conversation) {
      conversation = _conversation;
      var hasBob = false;
      conversation.participants.forEach(function(participant) {
        hasBob = hasBob || participant.address === bobName;
      });
      assert(hasBob);
      assert.equal(1, conversation.participants.size);
    }).then(done, done);
  });

  describe('#invite', function() {
    before(function setupCharlie(done) {
      charlie = new SIPJSUserAgent(charlieToken, options);
      charlie.on('invite', function(invite) {
        invite.accept();
      });

      charlie.connect().then(function() {
        return charlie.register();
      }).then(function() { done(); }, done);
    });

    before(function setupDonald(done) {
      donald = new SIPJSUserAgent(donaldToken, options);
      donald.on('invite', function(invite) {
        invite.accept();
      });

      donald.connect().then(function() {
        return donald.register();
      }).then(function() { done(); }, done);
    });

    it('should throw an exception if no participantAddress is passed', function() {
      assert.throws(conversation.invite.bind(conversation));
    });

    it('should throw an exception if participantAddress is not a string', function() {
      assert.throws(conversation.invite.bind(conversation, charlie));
    });

    it('should return a promise<Participant>', function(done) {
      conversation.invite(charlieName)
        .then(
          function(participant) { assert.equal(participant.address, charlieName); },
          function() { assert.fail(null, null, 'promise was rejected'); })
        .then(done, done);
    });
  });

  it('.sid', function() {
    assert(conversation.sid);
  });

  it('.participants contains Participant address', function() {
    var hasBob = false;
    conversation.participants.forEach(function(participant) {
      hasBob = hasBob || participant.address === bobName;
    });
    assert(hasBob);
    assert.equal(1, conversation.participants.size);
  });

  it('.localMedia', function() {
    assert(conversation.localMedia);
  });
});

function randomName() {
  return Math.random().toString(36).slice(2);
}
