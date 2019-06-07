/*

  FOR jpc-catalogs

*/

DROP FUNCTION pdf__search_rank_cd4(text,integer);
CREATE OR REPLACE FUNCTION public.pdf__search_rank_cd4(
    IN _query text,
    IN _package_id integer)
  RETURNS TABLE(item_id integer, rank real, headline text, url text, pageno integer, path ltree, h1 text, h2 text, revision_id integer, parent_id integer) AS
$BODY$
with X as ( select
  txt.object_id,
  txt.data->>'url' as url,
  (txt.data->>'pageno')::integer as pageno,
  txt.data->>'raw_text' as raw_text,
  ts_rank_cd(fti,qqq) as rank
  from txt,
    acs_objects, -- pdf-file
	to_tsquery('french', _query) as qqq
  where fti @@ qqq
  and (acs_objects.object_id = txt.object_id)
  and (acs_objects.package_id = _package_id) -- input.
  --and (acs_objects.object_type = 'cms-article') -- redondant
  ORDER BY rank DESC
  LIMIT 4999
)
select
  -- in the order of returns-columns
  object_id,
  rank,
  ts_headline('french', raw_text,
        to_tsquery('french',  _query),
        'StartSel ="<em>", StopSel ="</em>", MaxWords = 50, MinWords = 19, HighlightAll = false, MaxFragments = 99, FragmentDelimiter = "
<!>"')
       as snap,
  url,pageno, i.path,
  r.data->>'h1' as h1,
  r.data->>'h2' as h2,
  r.revision_id,
  i.parent_id
  --array_agg(y.related_object_id) as catalogs
from X
join cr_items i on (i.item_id = object_id)
left join cr_revisions r on (r.revision_id = i.latest_revision)
--join cr_item_rels y on (y.related_object_id = r.item_id)
--group by object_id, x.rank, x.raw_text, x.pageno, r.item_id

order by rank desc, i.item_id, pageno -- do we need to sort ?
$BODY$
  LANGUAGE sql VOLATILE
  COST 100
  ROWS 1000;



DROP FUNCTION pdf__search_rank_cd5(text,integer,ltree);

  CREATE OR REPLACE FUNCTION public.pdf__search_rank_cd5(
      IN _query text,
      IN _package_id integer,
      IN _path ltree
    )
    RETURNS TABLE(item_id integer, rank real, headline text, url text, pageno integer, path ltree, h1 text, h2 text, revision_id integer, parent_id integer) AS
  $BODY$
  with X as ( select
    txt.object_id,
    txt.data->>'url' as url,
    (txt.data->>'pageno')::integer as pageno,
    txt.data->>'raw_text' as raw_text,
    ts_rank_cd(fti,qqq) as rank
    from txt,
      acs_objects, -- pdf-file
      cr_items,
  	to_tsquery('french', _query) as qqq
    where fti @@ qqq
    and (acs_objects.object_id = txt.object_id)
    and (cr_items.item_id = txt.object_id)
    and (cr_items.path <@ _path) -- children
    and (acs_objects.package_id = _package_id) -- input.
    --and (acs_objects.object_type = 'cms-article') -- redondant
    ORDER BY rank DESC
    LIMIT 4999
  )
  select
    -- in the order of returns-columns
    object_id,
    rank,
    ts_headline('french', raw_text,
          to_tsquery('french',  _query),
          'StartSel ="<em>", StopSel ="</em>", MaxWords = 50, MinWords = 19, HighlightAll = false, MaxFragments = 99, FragmentDelimiter = "
  <!>"')
         as snap,
    url,pageno, i.path,
    r.data->>'h1' as h1,
    r.data->>'h2' as h2,
    r.revision_id,
    i.parent_id
    --array_agg(y.related_object_id) as catalogs
  from X
  join cr_items i on (i.item_id = object_id)
  left join cr_revisions r on (r.revision_id = i.latest_revision)
  --join cr_item_rels y on (y.related_object_id = r.item_id)
  --group by object_id, x.rank, x.raw_text, x.pageno, r.item_id

  order by rank desc, i.item_id, pageno -- do we need to sort ?
  $BODY$
    LANGUAGE sql VOLATILE
    COST 100
    ROWS 1000;
