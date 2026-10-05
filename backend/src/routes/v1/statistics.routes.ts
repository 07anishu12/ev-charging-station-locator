import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { getDatabase } from '../../infrastructure/database';
export const statisticsRouter=new Hono();
statisticsRouter.get('/',async c=> {
  const db=getDatabase();
  const [totals,states]=await Promise.all([
    db.execute(sql`SELECT count(*)::int AS "totalStations",count(distinct city_id)::int AS "totalCities",count(distinct operator_id)::int AS "totalOperators" FROM stations`),
    db.execute(sql`SELECT st.slug,st.name,st.code,count(s.id)::int AS "stationCount",count(distinct s.city_id)::int AS "cityCount" FROM states st LEFT JOIN stations s ON s.state_id=st.id GROUP BY st.id ORDER BY st.name`)
  ]);
  return c.json({data:{...totals.rows[0],states:states.rows}});
});
