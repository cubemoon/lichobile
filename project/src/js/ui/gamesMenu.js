/** @jsx m */
var utils = require('../utils');
var helper = require('./helper');
var settings = require('../settings');
var iScroll = require('iscroll');
var session = require('../session');
var i18n = require('../i18n');
var moment = window.moment;
var backbutton = require('../backbutton');
var xhr = require('../xhr');
var newGameForm = require('./newGameForm');
var gameApi = require('../lichess/game');
var challengesApi = require('../lichess/challenges');

var scroller = null;

const gamesMenu = {};

gamesMenu.isOpen = false;

gamesMenu.open = function() {
  helper.analyticsTrackView('Games Menu');
  backbutton.stack.push(gamesMenu.close);
  gamesMenu.isOpen = true;
  setTimeout(function() {
    if (scroller) scroller.goToPage(1, 0);
  }, 400);
  if (utils.hasNetwork() && session.isConnected()) session.refresh();
};

gamesMenu.close = function(fromBB) {
  if (fromBB !== 'backbutton' && gamesMenu.isOpen) backbutton.stack.pop();
  gamesMenu.isOpen = false;
};

gamesMenu.lastJoined = null;

function joinGame(g) {
  gamesMenu.lastJoined = g;
  gamesMenu.close();
  m.route('/game/' + g.fullId);
}

function acceptChallenge(id) {
  return xhr.joinChallenge(id)
  .then(data =>
    m.route('/game' + data.url.round)
  )
  .then(() => challengesApi.remove(id))
  .then(gamesMenu.close);
}

function declineChallenge(id) {
  return xhr.declineChallenge(id).then(() =>
    challengesApi.remove(id)
  );
}

function cardDims() {
  var vp = helper.viewportDim();
  var width = vp.vw * 85 / 100;
  var margin = vp.vw * 2.5 / 100;
  return {
    w: width + margin * 2,
    h: width + 145,
    innerW: width,
    margin: margin
  };
}

function renderViewOnlyBoard(cDim, fen, lastMove, color, variant) {
  const style = cDim ? { height: cDim.innerW + 'px' } : {};
  return (
    <div className="boardWrapper" style={style}>
      {helper.viewOnlyBoard(fen, lastMove, color, variant,
        settings.general.theme.board(), settings.general.theme.piece()
      )}
    </div>
  );
}

function timeLeft(g) {
  if (!g.isMyTurn) return i18n('waitingForOpponent');
  if (!g.secondsLeft) return i18n('yourTurn');
  var time = moment().add(g.secondsLeft, 'seconds');
  return m('time', {
    datetime: time.format()
  }, time.fromNow());
}

function renderGame(g, cDim, cardStyle) {
  const icon = g.opponent.ai ? ':' : utils.gameIcon(g.perf);
  const cardClass = [
    'card',
    'standard',
    g.color
  ].join(' ');
  const timeClass = [
    'timeIndication',
    g.isMyTurn ? 'myTurn' : 'opponentTurn'
  ].join(' ');
  const config = helper.isWideScreen() ?
    helper.ontouchY(() => joinGame(g)) :
    helper.ontouchX(() => joinGame(g));

  return (
    <div className={cardClass} key={'game.' + g.gameId} style={cardStyle}
      config={config}
    >
      {renderViewOnlyBoard(cDim, g.fen, g.lastMove, g.color, g.variant)}
      <div className="infos">
        <div className="icon-game" data-icon={icon ? icon : ''} />
        <div className="description">
          <h2 className="title">{utils.playerName(g.opponent, false)}</h2>
          <p>
            <span className="variant">{g.variant.name}</span>
            <span className={timeClass}>{timeLeft(g)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function renderChallenge(c, cDim, cardStyle) {
  const icon = utils.gameIcon(c.game.perf);
  const mode = c.game.rated ? i18n('rated') : i18n('casual');
  const timeAndMode = gameApi.time(c) + ', ' + mode;
  const user = c.player.user ? c.player.user : c.opponent.user;

  return (
    <div className="card standard challenge" style={cardStyle}>
      {renderViewOnlyBoard(cDim, c.game.fen, c.game.lastMove, null, c.game.variant)}
      <div className="infos">
        <div className="icon-game" data-icon={icon}></div>
        <div className="description">
          <h2 className="title">{i18n('playerisInvitingYou', utils.playerName(user, false))}</h2>
          <p className="variant">
            <span className="variantName">{i18n('toATypeGame', c.game.variant.name)}</span>
            <span className="time-indication" data-icon="p">{timeAndMode}</span>
          </p>
        </div>
        <div className="actions">
          <button config={helper.ontouchX(utils.f(acceptChallenge, c.game.id))}>
            {i18n('accept')}
          </button>
          <button config={helper.ontouchX(
            helper.fadesOut(declineChallenge.bind(undefined, c.game.id), '.card')
          )}>
            {i18n('decline')}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderAllGames(cDim) {
  const nowPlaying = session.nowPlaying();
  const challenges = challengesApi.list();
  const cardStyle = cDim ? {
    width: (cDim.w - cDim.margin * 2) + 'px',
    height: cDim.h + 'px',
    marginLeft: cDim.margin + 'px',
    marginRight: cDim.margin + 'px'
  } : {};
  const nbCards = challenges.length + nowPlaying.length + 1;
  let wrapperStyle, wrapperWidth;
  if (cDim) {
    // scroller wrapper width
    // calcul is:
    // ((cardWidth + visible part of adjacent card) * nb of cards) +
    //   wrapper's marginLeft
    wrapperWidth = ((cDim.w + cDim.margin * 2) * nbCards) +
      (cDim.margin * 2);
    wrapperStyle = helper.isWideScreen() ? {} : {
      width: wrapperWidth + 'px',
      marginLeft: (cDim.margin * 3) + 'px'
    };
  } else {
    wrapperStyle = {};
  }

  const challengesDom = challenges.map(c => renderChallenge(c, cDim, cardStyle));

  const allCards = challengesDom.concat(nowPlaying.map(g => renderGame(g, cDim, cardStyle)));

  if (!helper.isWideScreen()) {
    const newGameCard = (
      <div className="card standard" key="game.new-game" style={cardStyle}
        config={helper.ontouchX(() => { gamesMenu.close(); newGameForm.open(); })}
      >
        {renderViewOnlyBoard(cDim)}
        <div className="infos">
          <div className="description">
            <h2 className="title">{i18n('createAGame')}</h2>
            <p>{i18n('newOpponent')}</p>
          </div>
        </div>
      </div>
    );

    allCards.unshift(newGameCard);
  }

  return (
    <div id="all_games" style={wrapperStyle}>
      {allCards}
    </div>
  );
}

gamesMenu.view = function() {
  if (!gamesMenu.isOpen) return (
    <div id="games_menu" className="overlay overlay_fade" />
  );

  const vh = helper.viewportDim().vh;
  const cDim = cardDims();
  const wrapperStyle = helper.isWideScreen() ? {} : { top: ((vh - cDim.h) / 2) + 'px' };
  const wrapperConfig =
  helper.isWideScreen() ? utils.noop : function(el, isUpdate, context) {
    if (!isUpdate) {
      scroller = new iScroll(el, {
        scrollX: true,
        scrollY: false,
        momentum: false,
        snap: '.card',
        snapSpeed: 400,
        preventDefaultException: {
          tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|LABEL)$/
        }
      });

      context.onunload = function() {
        if (scroller) {
          scroller.destroy();
          scroller = null;
        }
      };
    }
    // see https://github.com/cubiq/iscroll/issues/412
    scroller.options.snap = el.querySelectorAll('.card');
    scroller.refresh();
  };
  const wrapperClass = helper.isWideScreen() ? 'overlay_popup' : '';

  return (
    <div id="games_menu" className="overlay overlay_fade open">
      <div className="wrapper_overlay_close" config={helper.ontouch(gamesMenu.close)} />
      <div id="wrapper_games" className={wrapperClass} style={wrapperStyle} config={wrapperConfig}>
        {helper.isWideScreen() ? (
          <header>
            {i18n('nbGamesInPlay', session.nowPlaying().length)}
          </header>
        ) : null
        }
        {helper.isWideScreen() ? (
          <div className="popup_content">
            {renderAllGames(null)}
          </div>
          ) : renderAllGames(cDim)
        }
      </div>
    </div>
  );
};

module.exports = gamesMenu;
