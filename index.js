#!/usr/bin/env node
const request = require('request')
const qs = require('querystring')
const chalk = require ('chalk')
const figlet = require('figlet')
const testData = require ('./testData')

let requestRateLimit = false

const endpoints = {
  exchangeInfo: function() {
    return requestEndpoint(
      `https://api.binance.com/api/v1/exchangeInfo`
    )
  },
  ticker24hr: function({ symbol }) {
    return requestEndpoint(
      `https://api.binance.com/api/v1/ticker/24hr`,
      arguments[0]
    )
  },
  tickerPrice: function({ symbol }) {
    return requestEndpoint(
      `https://api.binance.com/api/v1/ticker/price`,
      arguments[0]
    )
  }
}

async function start(endpoint, params, interval) {
   if(requestRateLimit) {
     console.log('Binance Request Rate Limit has been reached!')
     System.exit(1)
   }

   const tick = await endpoints[endpoint](params)
   if (interval) {
     await wait (interval)
     return start (endpoint, params, interval)
   } else {
     return tick
   }
}

const markets = ['BNB','ETH','BTC','USDT']

function findArbitrage (data) {
  data = data.reduce ((m, s) => ({
  	...m,
  	[s.symbol]: s
  }), {})
  const symbols = Object.keys(data)
  let assets = getAllAssets(symbols)
  const prices = assets.reduce((m, s) => ({
     ...m, 
     [s]: markets.map (mk => data[s + mk])
                 .filter (p => p != undefined)
  }), {})
  let arbitrage = Object.keys(prices).reduce((m, s) => ([
  	...m,
    ...prices[s].map((s1, i) => {
       const others = prices[s].slice(i+1, prices[s].length)
       return others.reduce((m, s2) => {
        	let bridge = data [
           s1.symbol.slice(s.length, s1.symbol.length) +
           s2.symbol.slice(s.length, s2.symbol.length)
         ]
        	let cw = (s1.bidPrice * bridge.bidPrice / s2.askPrice) - 1
        	let ccw = (s2.bidPrice / bridge.askPrice / s1.askPrice) - 1
        	
         return m.concat ({
         	  profit: (cw > ccw ? cw : ccw) * 100,
        	  s1: { 
        	  	symbol: s1.symbol,
        	  	baseAsset: getAssetsInPair(s1.symbol)[0],
        	  	quoteAsset: getAssetsInPair(s1.symbol)[1],
        	  	bidPrice: s1.bidPrice,
        	  	askPrice: s1.askPrice, 
        	  }, 
           s2: { 
        	  	symbol: s2.symbol,
        	  	baseAsset: getAssetsInPair(s2.symbol)[0],
        	  	quoteAsset: getAssetsInPair(s2.symbol)[1],
        	  	bidPrice: s2.bidPrice,
        	  	askPrice: s2.askPrice, 
        	  },
           bridge: { 
        	  	symbol: bridge.symbol,
        	  	baseAsset: getAssetsInPair(bridge.symbol)[0],
        	  	quoteAsset: getAssetsInPair(bridge.symbol)[1],
        	  	bidPrice: bridge.bidPrice,
        	  	askPrice: bridge.askPrice, 
        	  },
        	  cw: cw > ccw
         })
         //return m.concat ((cw > ccw ? cw : ccw) * 100)
       },[])
    }).reduce((m,a) => m.concat(a), []).filter (a => a.profit > 0)
  ]), []).sort ((a, b) => b.profit - a.profit)
  return arbitrage
}

function getAllAssets(symbols) {
  const assets = symbols.map (s => (
    s.match(new RegExp (`([A-Z]+)(${markets.join ('|')})`,'i'))[1]
  ))
  return assets.filter((e, pos) => (
    assets.indexOf(e) == pos
  ))
}

function getAssetsInPair(symbol) {	
	 return symbol.match(new RegExp (`([A-Z]+)(${markets.join ('|')})`,'i')).slice(1,3)
}

function requestEndpoint(endpoint, params) {
  endpoint = endpoint + (params ? '?' + qs.stringify(params) : '')
  return new Promise((resolve, reject) => {
    request(endpoint ,function (error, response, body) {
      if (error) {
        reject(error)
        return
      } else if (response.statusCode !== 200) {
        error = new Error('Error: HTTP Response status ' + response.statusCode)
        error.statusCode = response.statusCode
        reject(error)
        return
      }
      resolve(body)
    })
  })
}

function wait(secs = 0) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), secs*1000)
  })
}

function showAppName() {
  console.log (
    chalk.blue (
      figlet.textSync('H3ndrul B@t', {
        font: 'Ghost',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  )
}

/*
let endpoint = process.argv[2]
let params = { symbol: process.argv[3] }
start(endpoint, {}).then (console.log)
*/

function doArbitrageCalc() {
  endpoints.ticker24hr({}).then (data => {
    data = JSON.parse(data)
    const arbitrage = findArbitrage(data)
    console.log(JSON.stringify(arbitrage, null,2))
    //console.log (arbitrage[0].profit)
  })
}
 
 doArbitrageCalc()
 
// console.log(JSON.stringify(findArbitrage(testData), null, 2))
