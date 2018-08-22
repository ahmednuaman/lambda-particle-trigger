import async from 'async'
import request from 'request'

const {
  particle: config
} = JSON.parse(process.env.CONFIG)

export const handler = ({ body }, context, done) => {
  const {
    state
  } = JSON.parse(body)

  if (config && state) {
    const update = (done, particle, state) => {
      request.post(`https://api.particle.io/v1/devices/${particle}/relay`, {
        form: {
          access_token: config.access_token,
          arg: state
        }
      }, done)
    }

    async.parallel(config.particles.map((done) => (particle) => update(done, particle, state)), done)
  }
}
