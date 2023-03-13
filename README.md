# talko-dynamo-db-worker
Talko dynamodb-worker is an AWS lambda function that is designed to be periodically called to check for new blockchain updates from the.graph API. 

Together with https://github.com/ATARCA/nft-share-platform-discord-integration it forms a system where this dynamodb worker searches for new blockchain events via a public API, updates a dynamodb document database in AWS and allows other services such as AWS lambda social media integration scripts to consume blockchain information from document database. 

