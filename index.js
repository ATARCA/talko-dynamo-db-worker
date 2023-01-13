require('dotenv').config();
const AWS = require('aws-sdk');
const { createClient } = require('@urql/core')
const fetch = require('node-fetch')
const _ = require('lodash')
const {projectSpecificTokens, getMetadataObject, updateParams, getItem, updateItem} = require('./helpers')
const moment = require('moment')

exports.handler = async (event, context) => {
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
        } catch(err) {
            return err
        }
    }

    function dbInsertions(data, TABLE_NAME, client) {
        return _.map(data?.data?.tokens, async function (token) {
            var putParams = {
                TableName: TABLE_NAME,
                Item: {
                    'contractAddress': token.contractAddress,
                    'tokenId': parseInt(token.tokenId),
                    'mintBlock': token.mintBlock,
                    'metadataAvailable': false,
                    'timestamp': moment().valueOf(),
                    'discord': false,
                    'twitter': false
                },
                ReturnValues: 'ALL_OLD'
            };
            //update item to dynamodb
            return client.put(putParams).promise();
        });
    }

    async function main() {

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
            const data = await graphQLClient.query(projectSpecificTokens, {project: PROJECT, mintBlock: latestBlock, contractAddress: CONTRACT_ADDRESS}).toPromise()
            console.log('New tokens found: ', data?.data?.tokens.length)

            if(data?.data?.tokens.length != 0) {
                console.log('Attempting to update dynamodb')
                await Promise.all(dbInsertions(data, TABLE_NAME, client))
            }
        } else {
            console.log('Could not find any items from dynamo db database!')
            console.log('Starting to search tokens from block: ', STARTING_BLOCK)
            const data = await graphQLClient.query(projectSpecificTokens, {project: PROJECT, mintBlock: STARTING_BLOCK, contractAddress: CONTRACT_ADDRESS}).toPromise()
            console.log('New tokens found: ', data?.data?.tokens.length)

            if(data?.data?.tokens.length != 0) {
                console.log('Attempting to update dynamodb')
                await Promise.all(dbInsertions(data, TABLE_NAME, client))
            }
        }
    }

    await main()
}