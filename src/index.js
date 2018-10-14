import { SSM } from 'aws-sdk'
import _ from 'lodash'
import async from 'async'
import request from 'request'

const config = JSON.parse(process.env.CONFIG)

export const handler = async (event, context, done) => {
  const params = {
    Name: 'garden-lights'
  }

  let newState = _.get(event, 'data')

  const client = new SSM(config.aws)

  if (_.isUndefined(newState)) {
    try {
      newState = await new Promise((resolve, reject) => {
        client.getParameter(params, (error, data) => {
          if (error) {
            return reject(error)
          }

          const state = Number(!Number(data.Parameter.Value))

          resolve(state)
        })
      })
    } catch (error) {
      return done(error)
    }
  }

  try {
    await new Promise((resolve, reject) =>
      client.putParameter({
        ...params,
        Overwrite: true,
        Type: 'String',
        Value: String(newState)
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
