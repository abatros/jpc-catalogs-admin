delete
from acs_objects
using cr_items
where (object_id = item_id)
and (parent_id = 393361);
and (object_type = 'cms-article') -- option
;
