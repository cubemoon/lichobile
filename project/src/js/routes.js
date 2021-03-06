import game from'./ui/game';
import tv from'./ui/tv';
import seek from'./ui/seek';
import correspondence from'./ui/correspondence';
import otb from'./ui/otb';
import ai from'./ui/ai';
import settingsUi from'./ui/settings';
import settingsLang from './ui/settings/lang';
import boardThemes from'./ui/settings/boardThemes';
import pieceThemes from'./ui/settings/pieceThemes';
import user from'./ui/user';
import userGames from'./ui/user/games';
import players from './ui/players';
import ranking from './ui/players/ranking';

module.exports.init = function() {
  m.route(document.body, '/', {
    '/': ai,
    '/otb': otb,
    '/ai': ai,
    '/game/:id': game,
    '/game/:id/:color': game,
    '/game/:id/user/:userId': game,
    '/tv': tv,
    '/seek': seek,
    '/correspondence': correspondence,
    '/@/:id': user,
    '/@/:id/games': userGames,
    '/@/:id/games/:filter': userGames,
    '/players': players,
    '/ranking': ranking,
    '/settings': settingsUi,
    '/settings/themes/board': boardThemes,
    '/settings/themes/piece': pieceThemes,
    '/settings/lang': settingsLang
  });
};
