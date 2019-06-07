/*
    adapted to allow revisions for json-data
*/

CREATE OR REPLACE FUNCTION cms.content_extlink__new(
    new__name character varying,
    new__url character varying,
    new__label character varying,
    new__description character varying,
    new__parent_id integer,
    new__extlink_id integer,
    new__creation_date timestamp with time zone,
    new__creation_user integer,
    new__creation_ip character varying,
    new__package_id integer,
    new_data jsonb,
    new_path ltree)
  RETURNS integer AS
$BODY$
DECLARE
  v_extlink_id                cr_extlinks.extlink_id%TYPE;
  v_package_id                acs_objects.package_id%TYPE;
  v_label                     cr_extlinks.label%TYPE;
  v_name                      cr_items.name%TYPE;
  v_title text;
BEGIN

  ------------------------
  -- label = label || url
  ------------------------

  if new__label is null then
    v_label := new__url;
  else
    v_label := new__label;
  end if;

  ----------------------------
  -- name = name || 'link-xx'
  ----------------------------

  if new__name is null then
    select nextval('t_acs_object_id_seq') into v_extlink_id from dual;
    v_name := 'link' || v_extlink_id;
  else
    v_name := new__name;
  end if;

  ------------------------------------------------
  -- package_id = package_id || parent.package_id
  ------------------------------------------------

  if new__package_id is null then
    v_package_id := acs_object__package_id(new__parent_id);
  else
    v_package_id := new__package_id;
  end if;


  ------------------------------
  -- to create a first revision
  ------------------------------

  if (new_data is null) then
  else
    v_title := v_label;
  end if;


  v_extlink_id := content_item__new( --21--
      v_name,
      new__parent_id,
      new__extlink_id,
      null,   -- locale
      new__creation_date,
      new__creation_user,
      null,   -- context-id
      new__creation_ip,
      'content_item',
      'content_revision', -- content_extlink is not registered to this folder 393361
      v_title,   -- title NOT null to create a first cr_revision
      null,   -- description
      'text/plain',
      null,   -- nls_language
      null,   -- text
      null,  -- data
      null,  -- relation_tag
      'f',   -- is_live
      'text',   -- storage-type
      v_package_id,
      't'    -- with_child_rels what for ?
  );

  insert into cr_extlinks
    (extlink_id, url, label, description)
  values
    (v_extlink_id, new__url, v_label, new__description);

  update acs_objects
  set title = v_label
  where object_id = v_extlink_id;

  if (new_data is null) then
  else
    update cr_revisions
    set data = new_data
    from cr_items as i
    where (i.item_id = v_extlink_id)
    and (revision_id = i.latest_revision);
  end if;

  ----------------------------------------
  -- Untill we use out content_item__new
  ----------------------------------------

  update cr_items
  set path = new_path
  where (i.item_id = v_extlink_id);

  return v_extlink_id;

END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
