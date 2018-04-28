#!/usr/local/bin/node
'use strict';

const TICK_SEC = 15;

var addr2name = new Object();
addr2name['RMNdYUXmTr1LhBT9qKvg48ic73QKAwFY11'] = addr2name['RXDXVzfB7sEThmtLqpzS8QnKzc6MT4rDQa']  = 'prohashing.com';
addr2name['RQrGu6KtsYMbH6cRNiQdnLcy4meofzAWHS']  = 'mastermining.net';
addr2name['RNra5LWEinBh7uikkSZxRuRg114PUbeqSL']  = 'https://hobbyistpool.ddns.net/nyc Developer Pool';
addr2name['RVcmwoMpMrNppQeCrKWnZkzwX8ubdpGZYo']  = 'newyorkcoinpool.com';
addr2name['RB8trkrKbXQ8AaRhnUxcdBNnc4swCynRDF']  = 'mining-dutch.nl';
addr2name['RMR7DfZEBPDyXd1rCbARAK7YQMMSPByz79']  = 'nyc.mypool.club';
addr2name['RGZ2JZEFsRgEqngQn4vUYi2mPydMWygPdX']  = 'zpool.ca';
addr2name['RMkqWYHQuN9a4XsrP3CgHnmpnaUvcSp95p']  = 'gigarho.com';

const CMCAPI = 'https://api.coinmarketcap.com/v1/ticker/newyorkcoin/'
const POOLAPI = 'https://hobbyistpool.ddns.net/nyc/index.php?page=api&action=public';
const BLOCKEXPLORERAPI = 'https://explorer.nycoin.info/api/';
const request = require('requestretry').defaults({
        maxAttempts: 3,
        retryDelay: 5000,
        fullResponse: false,
});

const Influx = require('influx');
const db = new Influx.InfluxDB({
        host: 'influx',
        database: 'data',
        schema:
        [
                {
                        measurement: 'priceStats',
                        fields: {
                                rank: Influx.FieldType.INTEGER,
                                price_usd: Influx.FieldType.FLOAT,
                                price_btc: Influx.FieldType.FLOAT,
                                volume_usd: Influx.FieldType.FLOAT,
                                market_cap_usd: Influx.FieldType.FLOAT,
                                supply: Influx.FieldType.INTEGER,
                                percent_change_1h: Influx.FieldType.FLOAT,
                                percent_change_24h: Influx.FieldType.FLOAT,
                                percent_change_7d: Influx.FieldType.FLOAT,
                        },
                        tags: [
                                'coinName',
                        ]
                },
                {
                        measurement: 'netStats',
                        fields: {
                                hps: Influx.FieldType.FLOAT,
                        },
                        tags: [
                                'coinName',
                        ]
                },
                {
                        measurement: 'blockStats',
                        fields: {
                                height: Influx.FieldType.INTEGER,
                                diff: Influx.FieldType.FLOAT,
                                size: Influx.FieldType.INTEGER,
                                timestamp: Influx.FieldType.INTEGER,
                                txs: Influx.FieldType.INTEGER,
                        },
                        tags: [
                                'coinName',
                        ]
                },
                {
                        measurement: 'mining',
                        fields: {
                                coinboss: Influx.FieldType.STRING,
                                timestamp: Influx.FieldType.INTEGER,
                        },
                        tags: [
                                'coinName',
                                'poolName',
                        ]
                },
                {
                        measurement: 'pool',
                        fields: {
                                poolHps: Influx.FieldType.FLOAT,
                                workers: Influx.FieldType.INTEGER,
                                sharesThisRound: Influx.FieldType.FLOAT,
                                lastFound: Influx.FieldType.INTEGER,
                                hps: Influx.FieldType.FLOAT,
                        },
                        tags: [
                                'poolName',
                        ]
                },
        ]
});


function beApiReq(endpoint, arg) {
        if (arg == null)
                arg = '';
        var options = {
                uri: BLOCKEXPLORERAPI + endpoint + arg,
                headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'lta',
                },
                json: true,
        };
        return request(options);
}

function dbWriteHashStats() {
        beApiReq('getnetworkhashps').then(function(hps) {
                db.writePoints([{
                        measurement: 'netStats',
                        fields: { hps: hps },
                        tags: { coinName: 'NYCoin' },
                }], {
                        precision: 's',
                }).catch(err => {
                        console.error(err);
                });
        });
}

function dbWriteBlockStats() {
        beApiReq('getblockcount').then(function(height) {
                beApiReq('getblockhash?index=', height).then(function(hash) {
                        beApiReq('getblock?hash=', hash).then(function(block) {
                                beApiReq('getrawtransaction?txid=', block.tx[0] + '&decrypt=1').then(function(tx) {
                                        db.writePoints([{
                                                measurement: 'mining',
                                                fields: {
                                                       coinboss: tx.vout[0].scriptPubKey.addresses[0],
                                                       timestamp: tx.time,
                                                },
                                                tags: {
                                                       coinName: 'NYCoin',
                                                       poolName: addr2name[tx.vout[0].scriptPubKey.addresses[0]] == null ? tx.vout[0].scriptPubKey.addresses[0] : addr2name[tx.vout[0].scriptPubKey.addresses[0]],
                                                },
                                        }], {
                                                precision: 's',
                                        }).catch(err => {
                                                console.error(err);
                                        });
                                });
                                db.writePoints([{
                                        measurement: 'blockStats',
                                                fields: {
                                                    height: parseInt(block.height),
                                                    diff: parseFloat(block.difficulty),
                                                    size: parseInt(block.size),
                                                    timestamp: parseInt(block.time),
                                                    txs: block.tx.length,
                                                },
                                                tags: { coinName: 'NYCoin' },
                                }], {
                                        precision: 's',
                                }).catch(err => {
                                        console.error(err);
                                });
                        });
                });
        });
}

function dbWritePoolStats() {
        var options = {
                uri: POOLAPI,
                headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'lta',
                },
                json: true,
        };
        request(options).then(function(hp) {
//        console.log(hp);
                db.writePoints([{
                        measurement: 'pool',
                        fields: {
                                poolHps: hp.hashrate,
                                workers: hp.workers,
                                sharesThisRound: hp.shares_this_round,
                                lastFound: hp.last_block,
                                hps: hp.network_hashrate,
                        },
                        tags: { poolName: hp.pool_name },
                }], {
                        precision: 's',
                }).catch(err => {
                        console.error(err);
                });
        }).catch(err => {
                console.error(err);
        });
}

function dbWritePriceStats() {
        var options = {
                uri: CMCAPI,
                headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'lta',
                },
                json: true,
        };
        request(options).then(function(priceStats) {
                console.log(priceStats);
                db.writePoints([{
                        measurement: 'priceStats',
                        fields: {
                                rank: priceStats.rank,
                                price_usd: priceStats.price_usd,
                                price_btc: priceStats.price_btc,
//                                volume_usd: priceStats.24h_volume_usd,
                                volume_usd: '0',
                                market_cap_usd: priceStats.market_cap_usd,
                                supply: priceStats.total_supply,
                                percent_change_1h: priceStats.percent_change_1h,
                                percent_change_24h: priceStats.percent_change_24h,
                                percent_change_7d: priceStats.percent_change_7d,
                        },
                        tags: { coinName: 'NYCoin' },
                }], {
                        precision: 's',
                }).catch(err => {
                        console.error(err);
                });
        }).catch(err => {
                console.error(err);
        });
}

dbWriteHashStats();
dbWriteBlockStats();
dbWritePoolStats();
dbWritePriceStats();
setInterval(function() { dbWriteHashStats(); }, TICK_SEC * 1000);
setInterval(function() { dbWriteBlockStats(); }, TICK_SEC * 1000);
setInterval(function() { dbWritePoolStats(); }, TICK_SEC * 1000);
setInterval(function() { dbWritePriceStats(); }, TICK_SEC * 1000);
