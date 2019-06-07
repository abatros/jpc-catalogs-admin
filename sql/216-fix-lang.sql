update txt set lang = 'french'
from cms.pages p
where p.package_id >= 393000
and p.path <@ 'u2013_fr'
and (txt.object_id = p.object_id)
and (p.lang != 'french')
