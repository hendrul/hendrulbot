#!/usr/bin/env node
const request = require('request')
const qs = require('querystring')
const EventEmitter = require('events')

const tickEmitter = new EventEmitter()

let requestRateLimit = false

const AGG_TICKS = 10

const endpoints = {
  exchangeInfo: async function() {
    await wait(10)
    return requestEndpoint(
      `https://api.binance.com/api/v1/exchangeInfo`
    )
  },
  ticker24hr: async function({ symbol }) {
    return requestEndpoint(
      `https://api.binance.com/api/v1/ticker/24hr`,
      arguments[0]
    )
  },
  tickerPrice: async function({ symbol }) {
    return requestEndpoint(
      `https://api.binance.com/api/v1/ticker/price`,
      arguments[0]
    )
  }
}

async function start() {
  let exit = false
  while(!exit){
    if(requestRateLimit) {
      console.log('Binance Request Rate Limit has been reached!')
      System.exit(1)
    }
    let tick = await endpoints.tickerPrice()
    processTick(tick)
    console.log(tick)
  }
}

function processTick(tick) {
  let data = {
    buffer: tick.concat(data).slice(0, AGG_TICKS)
    prices: tick
  }
  tickEmitter.emit('tick', data)

}

function requestEndpoint(endpoint, params) {
  endpoint = endpoint + (params ? '?'+qs.stringify(params) : '')
  return new Promise((resolve, reject) => {
    request(endpoint ,function (error, response, body) {
      if(error){
        reject(error)
        return
      } else if(response.statusCode !== 200) {
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
    setTimeout(()=>resolve(), secs*1000)
  })
}

start()
