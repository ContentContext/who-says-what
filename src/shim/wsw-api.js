/*
 * wsw-api.js: an in-browser replacement for the old api2.youngvoters.eu JSONP API.
 *
 * The original comparison-tool bundle calls five endpoints with $http({method: 'JSONP'}):
 *
 *   category.getList?category_type=key_issue   -> the key issues
 *   world.getMarkets                            -> the countries
 *   party.getList                               -> every party (national + European)
 *   party.getList?market_code=eu                -> European parties
 *   party.getList?market_codes[]=it&...         -> national parties for the chosen countries
 *   comparison.build?key_issues[]=..&party_ids[]=..  -> the statements to show
 *
 * The build points the bundle's apiUrl at "wsw://api". This file decorates $http so that
 * any JSONP request to that address is answered from data/wsw.json, which the build
 * generates from the CSV files in data/. Every other request (templates and so on)
 * goes through the real $http untouched.
 *
 * Response shapes follow the field names the bundle and templates read. See
 * docs/data-format.md.
 */
(function (angular, window) {
  'use strict';

  var API = 'wsw://api';
  var BASE = window.WSW_BASE || '/';
  var DATA_URL = BASE + 'data/wsw.json' + (window.WSW_DATA_VERSION ? '?v=' + window.WSW_DATA_VERSION : '');

  function asArray(v) {
    if (v === undefined || v === null || v === '') return [];
    return angular.isArray(v) ? v : [v];
  }

  function makeEngine(db) {
    var issuesById = {}, partiesById = {}, countryOrder = {}, partyOrder = {}, issueOrder = {};
    angular.forEach(db.issues, function (i, n) { issuesById[i.category_id] = i; issueOrder[i.category_id] = n; });
    angular.forEach(db.countries, function (c, n) { countryOrder[c.market_code] = n; });
    angular.forEach(db.parties, function (p, n) { partiesById[p.party_id] = p; partyOrder[p.party_id] = n; });

    function issueOut(i) {
      return {
        issue_id: i.category_id,
        category_id: i.category_id,
        category_name: i.category_name,
        category_slug: 'compare/' + i.category_slug
      };
    }
    function countryOut(c) {
      return { market_id: c.market_id, market_code: c.market_code, country_name: c.country_name };
    }
    function partyOut(p) {
      return {
        party_id: p.party_id,
        party_name: p.party_name,
        party_abbreviation: p.party_abbreviation,
        party_market_code: p.party_market_code
      };
    }
    function byCountryThenOrder(a, b) {
      var ca = a.party_market_code === 'eu' ? 1e6 : countryOrder[a.party_market_code];
      var cb = b.party_market_code === 'eu' ? 1e6 : countryOrder[b.party_market_code];
      return ca - cb || partyOrder[a.party_id] - partyOrder[b.party_id];
    }

    return {
      'category.getList': function () {
        return db.issues.map(issueOut);
      },
      'world.getMarkets': function () {
        return db.countries.map(countryOut);
      },
      'party.getList': function (params) {
        var codes = asArray(params['market_codes[]']).concat(asArray(params.market_code));
        return db.parties
          .filter(function (p) { return codes.length === 0 || codes.indexOf(p.party_market_code) >= 0; })
          .sort(byCountryThenOrder)
          .map(partyOut);
      },
      'comparison.build': function (params) {
        var issueIds = asArray(params['key_issues[]']).map(String);
        var partyIds = asArray(params['party_ids[]']).map(String);
        return db.statements
          .filter(function (s) {
            return issueIds.indexOf(String(s.category_id)) >= 0 && partyIds.indexOf(String(s.party_id)) >= 0 &&
              issuesById[s.category_id] && partiesById[s.party_id];
          })
          .sort(function (a, b) {
            return issueOrder[a.category_id] - issueOrder[b.category_id] ||
              byCountryThenOrder(partiesById[a.party_id], partiesById[b.party_id]);
          })
          .map(function (s) {
            var p = partiesById[s.party_id], i = issuesById[s.category_id];
            return {
              party_id: p.party_id,
              party_name: p.party_name,
              party_market_code: p.party_market_code,
              comparison_market_code: p.party_market_code,
              category_id: i.category_id,
              category_name: i.category_name,
              comparison_text: s.comparison_text,
              comparison_text_original: s.comparison_text_original,
              source_title: s.source_title,
              source_url: s.source_url
            };
          });
      }
    };
  }

  angular.module('comparisonToolApp').config(['$provide', function ($provide) {
    $provide.decorator('$http', ['$delegate', '$q', function ($http, $q) {
      var enginePromise = null;
      function engine() {
        if (!enginePromise) {
          enginePromise = $http.get(DATA_URL, { cache: true }).then(function (r) { return makeEngine(r.data); });
        }
        return enginePromise;
      }

      // Promises from $http in AngularJS 1.2 also have .success() and .error().
      function httpPromise(promise) {
        promise.success = function (fn) {
          promise.then(function (r) { fn(r.data, r.status, r.headers, r.config); });
          return promise;
        };
        promise.error = function (fn) {
          promise.then(null, function (r) { fn(r.data, r.status, r.headers, r.config); });
          return promise;
        };
        return promise;
      }

      function local(config) {
        var method = config.url.slice(API.length + 1);
        var params = config.params || {};
        var headers = function () { return null; };
        return httpPromise(engine().then(function (e) {
          if (!e[method]) return $q.reject({ data: null, status: 404, headers: headers, config: config });
          return { data: e[method](params), status: 200, headers: headers, config: config };
        }, function (r) {
          return $q.reject({ data: null, status: r.status || 0, headers: headers, config: config });
        }));
      }

      function wrapped(config) {
        if (config && config.method === 'JSONP' && typeof config.url === 'string' && config.url.indexOf(API) === 0) {
          return local(config);
        }
        return $http.apply(this, arguments);
      }
      angular.extend(wrapped, $http);
      return wrapped;
    }]);
  }]);

  // A party without a logo file shows a neutral placeholder rather than a broken image.
  document.addEventListener('error', function (evt) {
    var img = evt.target;
    if (img && img.tagName === 'IMG' && img.parentNode && /\bparty-logo\b/.test(img.parentNode.className) &&
        img.getAttribute('data-wsw-fallback') !== '1') {
      img.setAttribute('data-wsw-fallback', '1');
      img.src = BASE + 'images/party-logo-placeholder.png';
    }
  }, true);

  window.WSW_API = { makeEngine: makeEngine };
})(window.angular, window);
