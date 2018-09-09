import { DynamoDB } from 'aws-sdk'
import _ from 'lodash'
import AWSXRay from 'aws-xray-sdk'
import async from 'async'
import request from 'request'

const config = JSON.parse(process.env.CONFIG)
const endpoint = process.env.STAGE === 'dev' ? 'http://localhost:18764' : undefined

export const handler = async (event, context, done) => {
  let newState = _.get(event, 'data')

  const doc = new DynamoDB.DocumentClient({ service: new DynamoDB({ ...config.aws, endpoint }) })
  const params = {
    TableName: 'iot_house',
    Key: {
      button: 'garden_lights'
    }
  }

  AWSXRay.captureAWSClient(doc.service)

  if (_.isUndefined(newState)) {
    try {
      newState = await new Promise((resolve, reject) =>
        doc.get(params, (error, { Item }) => {
          if (error) {
            return reject(error || 'Item not found')
          }

          let newState

          if (Item) {
            const {
              state
            } = Item

            newState = !state
          } else {
            newState = false
          }

          resolve(newState)
        })
      )
    } catch (error) {
      return done(error)
    }
  }

  try {
    await new Promise((resolve, reject) =>
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
    )

    if (config.particle) {
      const update = (done, particle) => {
        request.post(`https://api.particle.io/v1/devices/${particle}/relay`, {
          form: {
            access_token: config.particle.access_token,
            arg: Number(newState)
          }
        }, done)
      }

      async.parallel(
        config.particle.particles.map((particle) => (done) => update(done, particle)),
        (error, results) => {
          console.log(error, results)
          done(error, results)
        }
      )
    }
  } catch (error) {
    return done(error)
  }
}
