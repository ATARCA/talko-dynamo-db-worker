require('dotenv').config();
const AWS = require('aws-sdk');
const { createClient } = require('@urql/core')
const fetch = require('node-fetch')
const _ = require('lodash')
const {projectSpecificTokens, getMetadataObject, updateParams, getItem, updateItem} = require('./helpers')
const moment = require('moment')
const API_URL = process.env.API_URL
const PROJECT = process.env.PROJECT
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const TABLE_NAME = process.env.TABLE_NAME
const STARTING_BLOCK = process.env.STARTING_BLOCK
console.log("ENVIRONMENT VARIABLES\n" + JSON.stringify(process.env, null, 2))

const aws_remote_config = {
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.REGION
}

AWS.config.update(aws_remote_config)
const client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})

async function queryItems(client, params) {
    try {
        return client.query(params).promise()
        //return data.Item
    } catch(err) {
        return err
    }
}

async function putItem(client, params) {
    try {
        return client.put(params).promise()
    } catch(err) {
        return err
    }
}

async function main() {
    //attempt to retrieve records form dynamodb
    //if no records, start querying new updates from the assigned env parameter blockgheight
    //if records exist, find the latestest blockheight
    //start querying from the latest blockheight

    //get all tokens, original or shared since the 
    //update dynamodb with token information
    //tokenid, blockheight, metadata available, posted to twitter, posted to discord, timestamp

    //query table, filter by contractAddress and find the latest tokenId or blockheight

    //the highest blockheight should be a starting point to query the.graph to find newer tokens

    //attempt to save information about new token mints to dynamodb

    //return highest sort key item (tokenId) with given contractAddress

    //starting mint_block, 

    const graphQLClient = createClient({
        url: API_URL,
        fetch: fetch,
    })

    
    var params = {
        ExpressionAttributeValues: {
            ':c': CONTRACT_ADDRESS
        },
        KeyConditionExpression: 'contractAddress = :c',
        TableName: TABLE_NAME,
        ScanIndexForward: false,
        Limit: 1
    }

    const results = await queryItems(client, params)

    if (results?.Items.length != 0) {
        const latestTokenId = results.Items[0].tokenId
        const latestBlock = results.Items[0]?.mintBlock
        console.log('latest tokenId is ', latestTokenId)
        console.log('latest block is ', latestBlock)
        //try to fetch new items and update them to dynamoDb
        const data = await graphQLClient.query(projectSpecificTokens, {project: PROJECT, mintBlock: latestBlock, contractAddress: CONTRACT_ADDRESS}).toPromise()
        console.log(data)
    } else {
        console.log('Could not find any items from dynamo db database!')
        //STARTING_BLOCK
        const data = await graphQLClient.query(projectSpecificTokens, {project: PROJECT, mintBlock: STARTING_BLOCK, contractAddress: CONTRACT_ADDRESS}).toPromise()

        //go through all tokens, append token data to dynamoDb
        data?.data?.tokens.forEach(async (token) => {
            //update token details to dynamodb
            //console.log(token)
            var putParams = {
                TableName: TABLE_NAME,
                Item: {
                    'contractAddress': token.contractAddress,
                    'tokenId': parseInt(token.tokenId),
                    'mintBlock': token.mintBlock,
                    'metadataAvailable': false,
                    'timestamp': moment().valueOf(),
                    'discord': false,
                    'twitter':false
                },
                ReturnValues: 'ALL_OLD'
            }
            //update item to dynamodb
            const result = await putItem(client, putParams)
            //console.log(result)

        })
        
        //console.log(data)
    }
    //console.log(results)
}


main()
