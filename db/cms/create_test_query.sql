drop function if exists cms.test_query();

create or replace function cms.test_query()
returns jsonb as
$$
const y = 100;
const x = 3.14;
const o = {
  a:1,
  b:2
};

Object.assign(o,{c:3});
plv8.elog(NOTICE,`
  Hello dolly${y}
  `);
return o;
$$ language plv8;
