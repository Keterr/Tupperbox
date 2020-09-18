const { performance } = require('perf_hooks');
const influx = require('influx');

const conn = new influx.InfluxDB(process.env.INFLUX_URL);

module.exports = {
    conn,

    logDatabaseCall: async (func, query, params) =>  {
        let t0 = performance.now();
        let output = await func(query, params);
        let executionTime = performance.now() - t0;
        conn.writePoints([{
            measurement: 'db',
            tags: { query },
            fields: { executionTime },
        }]);
        return output;
    },
}