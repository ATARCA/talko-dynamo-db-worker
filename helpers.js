//Helper functions and constants for talko webhook
require('dotenv').config();
const {gql} = require('@urql/core')
const fetch = require('node-fetch')
const _ = require('lodash')

const TABLE_NAME = process.env.TABLE_NAME

//get latest item by blockheight from the table
//if not items received apply the starting blockheight from envs

const params = {
    TableName: TABLE_NAME,
    Key: {"id":"production-blockheight"}
}

const projectSpecificTokens = gql`
query TokenQuery($project: String!, $mintBlock: String!, $contractAddress: String!) {
    tokens(orderBy: tokenId, orderDirection: asc, where: {project: $project, mintBlock_gt: $mintBlock, contractAddress: $contractAddress}) {
        tokenId
        contractAddress
        isLikeToken
        metadataUri
        mintBlock
        ownerAddress
        isOriginal
        isSharedInstance
        parentTokenId
        project {
            id
        }
        category {
            id
        }
    }
}
`

//retrieve metadata from a given url
async function getMetadataObject(metadataUri) {
    try {
        const response = await fetch(metadataUri)
        return response
    } catch(error) {
        console.log('Failed to retrieve metadata from metadataurl', error)
    } 
}

//refactor to support new table structure
function updateParams(latestMintBlock){
    return  {
        TableName: TABLE_NAME,
        Key: {"id":"production-blockheight"},
        UpdateExpression: 'set blockheight = :v',
        ExpressionAttributeValues: {
            ':v': _.parseInt(latestMintBlock)
        }
    }
}

//takes in dynamodb client
async function getItem(client) {
    try {
        const data = await client.get(params).promise()
        return data.Item
    } catch (err) {
        return err
    }
}

//refactor to support new table structure
//takes in dynamodb client and latest mintblock
async function updateItem(client, latestMintBlock) {
    const updatedParams = updateParams(latestMintBlock)
    try {
        const data = await client.update(updatedParams).promise()
        console.log("Success", data)
    } catch(err) {
        console.log("Error", err)
    }
}

module.exports = {projectSpecificTokens, getMetadataObject, updateParams, getItem, updateItem}