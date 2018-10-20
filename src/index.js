import { SSM } from 'aws-sdk'
import _ from 'lodash'
import async from 'async'
import request from 'request'

const config = JSON.parse(process.env.CONFIG)

export const handler = (event) =>
  new Promise(async (resolve, reject) => {
    const params = {
      Name: 'garden-lights'
    }

    let newState = _.get(event, 'data')

    const client = new SSM(config.aws)

    console.log({ newState })

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
        console.log({ error })
        return reject(error)
      }
    }

    try {
      await new Promise((resolve, reject) =>
        client.putParameter({
          ...params,
          Overwrite: true,
          Type: 'String',
          Value: String(!!newState)
        }, (error) => {
          if (error) {
            return reject(error)
          }

          resolve(newState)
        })
      )

      console.log({ newState })

      if (config.particle) {
        const update = (done, particle) => {
          console.log({particle})

          request.post(`https://api.particle.io/v1/devices/${particle}/relay`, {
            form: {
              access_token: config.particle.access_token,
              arg: Number(newState)
            },
            timeout: 4000
          }, done)
        }

        async.parallel(
          config.particle.particles.map((particle) => (callback) => update(callback, particle)),
          (error, results) => {
            console.log(error, results)

            if (error) {
              reject(error)
            } else {
              resolve(results)
            }
          }
        )
      } else {
        reject(config.particle)
      }
    } catch (error) {
      console.log({ error })
      reject(error)
    }
  })
