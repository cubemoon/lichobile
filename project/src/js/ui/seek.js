import utils from '../utils';
import helper from './helper';
import layout from './layout';
import widgets from './widget/common';
import popupWidget from './widget/popup';
import xhr from '../xhr';
import i18n from '../i18n';
import socket from '../socket';

var nbPlaying = 0;

var seek = {};

seek.controller = function() {

  var hookId;

  helper.analyticsTrackView('Seek');

  var createHook = function() {
    if (hookId) return; // hook already created!
    xhr.seekGame().then(function(data) {
      hookId = data.hook.id;
    }, function(error) {
      utils.handleXhrError(error);
    });
  };

  xhr.lobby(true).then(data => {
    socket.createLobby(data.lobby.version, createHook, {
      redirect: d => m.route('/game' + d.url),
      n: function(n) {
        nbPlaying = n;
        m.redraw();
      },
      resync: () => xhr.lobby().then(d => {
        socket.setVersion(d.lobby.version);
      })
    });
  });

  function cancel() {
    if (hookId) socket.send('cancel', hookId);
    utils.backHistory();
  }

  document.addEventListener('backbutton', cancel, false);

  return {
    cancel: cancel,

    onunload: function() {
      socket.destroy();
      document.removeEventListener('backbutton', cancel, false);
    }
  };
};

seek.view = function(ctrl) {
  function overlays() {
    return popupWidget(
      null,
      m('div', i18n('waitingForOpponent') + '...'),
      m('div.seek_real_time', [
        m('div.nb_players', i18n('nbConnectedPlayers', nbPlaying || '?')),
        m('br'),
        m('br'),
        m('button[data-icon=L]', {
          config: helper.ontouch(ctrl.cancel)
        }, i18n('cancel'))
      ]),
      true
    );
  }

  return layout.board(widgets.header, widgets.board, widgets.empty, overlays);
};

module.exports = seek;
