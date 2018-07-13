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

function start(endpoint, params, interval) {
   if(requestRateLimit) {
     console.log('Binance Request Rate Limit has been reached!')
     System.exit(1)
   }

   return endpoints[endpoint](params).then(tick => {
   	 console.log(tick)
   	 if (interval) {
   	   return wait (interval).then (() => start (endpoint, params, interval))
   	 }
   	 return tick
   })
}

const markets = ['BNB','ETH','BTC','USDT']

function findArbitrage () {
	return endpoints.ticker24hr({}).then (data => {
		data = JSON.parse(data)
		data = data.reduce ((m, s) => Object.assign(
		  {[s.symbol]: s}, m
		), {})
		const pairs = Object.keys(data)
		let symbols = pairs.map (p => (
			 p.match(new RegExp (`([A-Z]+)(${markets.join ('|')})`,'i'))[1]
    ))
    symbols = symbols.filter ((e, pos) => (
			symbols.indexOf(e) == pos
    ))
    const prices = symbols.reduce((m, s) => Object.assign(
    	 m, {[s]: markets.map (mk => data[s + mk])}
    ), {})
		const bestBet = Object.keys(prices).reduce ((m, s)=>(
		  Object.assign(m, {
        [s]: {
          bestBuy: prices[s].reduce((m, p) => {
            if(!m&&!p) return
            if(!m) return p
            if(!p) return m
            let bridge = data[
            m.symbol.slice(s.length, m.symbol.length) +
            p.symbol.slice(s.length, p.symbol.length)
              ]
            return p.askPrice < m.askPrice * bridge.askPrice ? p : m
          }),
          bestSell: prices[s].reduce((m, p) => {
            if(!m&&!p) return
            if(!m) return p
            if(!p) return m
            let bridge = data[
              m.symbol.slice(s.length, m.symbol.length) +
              p.symbol.slice(s.length, p.symbol.length)]
            return p.bidPrice > m.bidPrice * bridge.bidPrice ? p : m
          })
        }
		  })
    ))
    return bestBet
  })
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
/*
console.log (
	chalk.blue (
		figlet.textSync('H3ndrul B@t', {
      font: 'Ghost',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })
  )
)*/

let endpoint = process.argv[2]
let params = { symbol: process.argv[3] }
//start(endpoint, params).then ()
findArbitrage ().then (console.log)
