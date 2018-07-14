#!/usr/bin/env node
const request = require('request')
const qs = require('querystring')
const chalk = require ('chalk')
const figlet = require('figlet')

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
  const pairs = data.map(s => s.symbol)
  let symbols = getAllSymbols(pairs)
  const prices = symbols.reduce((m, s) => Object.assign(
     m, {[s]: markets.map (mk => data[s + mk])}
  ), {})
  const bestBet = Object.keys(prices).reduce ((m, s)=>(
    Object.assign(m, {
      [s]: prices[s].reduce((m, p) => {
        if(!m&&!p) return
        if(!m) return p
        if(!p) return m
        let bridge = data[
          m.symbol.slice(s.length, m.symbol.length) +
          p.symbol.slice(s.length, p.symbol.length)
        ]
        return p.askPrice < m.askPrice * bridge.askPrice ? p : m
      },[])
    })
  ))
  return bestBet
}

function getAllSymbols(pairs) {
  return pairs.map (p => (
    p.match(new RegExp (`([A-Z]+)(${markets.join ('|')})`,'i'))[1]
  )).filter ((e, pos) => (
    symbols.indexOf(e) == pos
  ))
}

//function getBaseAsset(symbol, symbols)

function a(s1,s2,bridge) {
  //bid-ask-ask
  //s1.bidPrice
  //bid-bid-ask
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


let endpoint = process.argv[2]
let params = { symbol: process.argv[3] }
start(endpoint, {}).then (console.log)

// function doArbitrageCalc() {
//   endpoints.ticker24hr({}).then (data => {
//     data = JSON.parse(data)
//     console.log(findArbitrage(data))
//   })
// }

