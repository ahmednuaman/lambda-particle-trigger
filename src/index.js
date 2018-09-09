import { DynamoDB } from 'aws-sdk'
import async from 'async'
import request from 'request'

const {
  particle: config
} = JSON.parse(process.env.CONFIG)

export const handler = async ({ data }, context, done) => {
  let state

  if (data) {
    state = data.state
  } else {
    const doc = new DynamoDB.DocumentClient({ service: new DynamoDB({...config.aws, endpoint}) })
    const params = {
      TableName: 'iot_house',
      Key: {
        button: 'garden_lights'
      }
    }

    AWSXRay.captureAWSClient(doc.service)

    try {
      state = await new Promise((resolve, reject) =>
        doc.get(params, (error, { Item: item }) => {
          if (error || !item) {
            return reject(error || 'Item not found')
          }

          const {
            state
          } = item

          const newState = !state

          doc.put({
            TableName: params.TableName,
            Item: {
              ...params.Key,
              state: newState
            }
          }, (error) => {
            if (error) {
              return reject(error)
            }

            resolve(newState)
          })
        })
      )
    } catch (error) {
      return done(error)
    }
  }

  if (config && state) {
    const update = (done, particle) => {
      request.post(`https://api.particle.io/v1/devices/${particle}/relay`, {
        form: {
          access_token: config.access_token,
          arg: state
        }
      }, done)
    }

    async.parallel(config.particles.map((done) => (particle) => update(done, particle)), done)
  }
}
