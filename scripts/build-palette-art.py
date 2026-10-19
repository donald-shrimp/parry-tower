"""Offline material recolouring; no generation, no changes to originals.

Requires Python, Pillow, NumPy and Node. Run: python scripts/build-palette-art.py
Spatial material masks below are independent from the articulation masks.
"""
import importlib.util
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pixel_builder', ROOT / 'scripts/build-pixel-art.py')
pixel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pixel)
DEST = ROOT / 'assets/character-art/palette-candidates'

# Dark / body / highlight ramps preserve the painted shading within a material.
RAMPS = {
 'ember_slime': {'gel':['211b24','a8432a','ffd58a']},
 'molten_sentinel': {'metal':['171e28','4d5359','b0b4b7'], 'cloth':['291f26','652b25','b46645'], 'trim':['4d251e','c06432','ffc278']},
 'forge_master': {'metal':['171c28','41414b','9698a1'], 'cloth':['291e25','652b25','bb6940'], 'trim':['493320','9b6b38','ffba65'], 'blade':['352d29','a87849','ffe1a2']},
 'frost_wraith': {'ghost':['27364f','90bed0','e2f5f4']},
 'silver_duelist': {'metal':['29394c','a2b4c5','edf5f8'], 'cloth':['1d2a44','31536f','95b7cf'], 'trim':['35435d','9eb6cb','f0f6ff'], 'blade':['394c64','bfcbd4','f4fcff']},
 'frost_priest': {'metal':['35445e','acbdcd','eef5fa'], 'cloth':['292d4e','637dab','c6dcf2'], 'trim':['635875','c9b384','f4e9c7'], 'blade':['344d6d','b7d1e1','f4ffff']},
 'star_cantor': {'cloth':['151a30','303860','9d90c3'], 'trim':['655967','c4ae89','fff1cd']},
 'orbital_clockwork': {'metal':['262b32','6c737b','c6d3d8'], 'cloth':['24263c','4d5378','9fabc7'], 'trim':['493d38','b39a61','e8d7a4']},
 'star_warden': {'metal':['31364c','aeb8d0','e8eeff'], 'cloth':['171e37','2f355a','8c91b6'], 'trim':['55454d','c8b079','f9edcb'], 'blade':['364563','b9cee5','effaff']},
 'void_knight': {'metal':['191c29','444150','b4afc3'], 'cloth':['1d192b','4d365e','947baf'], 'trim':['292132','5a486c','b79bcf'], 'blade':['3b354b','a59bb7','dfdbe7']},
 'last_assassin': {'metal':['181c29','454352','a5a9bc'], 'cloth':['1b1927','423249','8b789a'], 'trim':['2d202f','733b55','bb7c96'], 'blade':['393849','a4a4bb','e6e4ee']},
 'endking': {'metal':['141921','353942','9298a5'], 'cloth':['241e33','5c3d73','aa8ebc'], 'trim':['503522','a7792d','e9bd60'], 'blade':['3a344b','b3a8c5','f4f1fa']},
}

# The user preferred the original forge palette and approved the other nine.
RETAIN_ORIGINAL = {'forge_master'}
REVISED = set()

# Hand-authored source-coordinate material regions, not motion ownership masks.
REGIONS = {
 'guardian': {
  'ready': {
   'cloth': [[[702,443],[806,495],[1005,566],[1225,570],[1445,605],[1445,1050],[1113,962],[846,816],[660,643]], [[395,608],[506,579],[600,620],[663,804],[565,851],[388,711]]],
   'blade': [[[704,147],[1445,0],[1445,222],[714,251]]],
   'trim': [[[405,293],[559,292],[576,404],[414,424]], [[455,493],[551,486],[567,566],[464,584]], [[301,188],[713,183],[720,281],[301,281]]],
  },
  'contact': {
   'cloth': [[[1044,452],[1156,522],[1445,561],[1445,1007],[1208,942],[1087,751],[977,613]], [[760,596],[897,565],[1009,606],[1079,829],[878,878],[734,707]]],
   'blade': [[[0,486],[779,486],[791,581],[0,581]]],
   'trim': [[[735,178],[910,172],[946,305],[741,336]], [[828,424],[932,419],[963,511],[833,532]], [[779,461],[846,461],[849,635],[779,635]]],
  },
 },
 'duelist': {'ready': {
  'cloth': [[[605,191],[750,174],[916,284],[999,375],[1250,340],[1445,367],[1445,947],[1212,917],[1020,788],[887,669],[828,573],[720,548]], [[475,586],[698,548],[856,646],[825,806],[710,750],[526,862],[416,774]]],
 }},
 'clockwork': {'ready': {
  'cloth': [[[849,518],[1052,503],[1170,595],[1205,725],[1140,853],[1005,732],[918,658]]],
 }},
}

# Identity-specific corrections: do not change the approved frost-priest mask
# just because it shares the guardian original with the king.
MATERIAL_REGIONS = {
 'orbital_clockwork': {'ready': {
  'cloth': [[[958,518],[1010,541],[1094,557],[1147,542],[1154,566],[1145,588],[1156,617],[1175,647],[1199,701],[1226,747],[1254,794],[1288,845],[1309,879],[1258,844],[1233,827],[1229,836],[1209,820],[1183,807],[1162,786],[1155,803],[1138,788],[1121,779],[1111,815],[1082,788],[1059,750],[1041,735],[1021,706],[1036,759],[1058,800],[1071,837],[1080,870],[1032,840],[1016,835],[1002,815],[981,803],[963,778],[944,771],[929,746],[915,711],[908,688],[937,680],[949,660],[960,632],[964,607],[961,582],[948,553]]],
 }},
 'endking': {
  'ready': {
   'cloth': [[[708,417],[734,436],[752,469],[764,493],[791,511],[835,534],[882,553],[866,552],[927,571],[977,586],[965,589],[1007,599],[1055,596],[1105,589],[1154,591],[1126,600],[1197,608],[1232,631],[1263,663],[1200,644],[1244,677],[1281,706],[1311,739],[1336,795],[1291,763],[1302,807],[1332,850],[1355,897],[1372,956],[1339,941],[1297,934],[1274,915],[1225,908],[1210,891],[1160,884],[1123,845],[1099,854],[1076,849],[1068,834],[1017,816],[1029,851],[973,825],[938,804],[897,797],[848,767],[819,747],[790,714],[752,700],[721,656],[685,621],[657,581],[660,550],[673,519],[698,483],[710,458]],
             [[486,637],[517,647],[545,642],[559,634],[575,676],[586,708],[604,741],[615,762],[641,784],[612,785],[633,805],[588,788],[596,813],[576,800],[574,826],[552,805],[536,803],[518,777],[516,790],[499,768],[492,758],[474,722],[465,696],[468,662]],
             [[440,696],[468,707],[482,744],[491,778],[474,759],[459,768],[452,737],[437,730]]],
   'blade': [[[704,147],[1445,0],[1445,222],[714,251]]],
   'trim': [[[415,354],[432,295],[446,331],[480,257],[490,329],[517,293],[517,337],[552,328],[533,357],[553,365],[522,378],[518,393],[484,382],[460,388],[441,377]],
            [[416,515],[431,497],[459,491],[477,497],[494,509],[512,557],[499,567],[479,573],[448,559],[431,550]],
            [[620,132],[650,116],[671,128],[673,168],[695,195],[704,267],[680,264],[666,234],[649,244],[637,197]],
            [[309,228],[333,206],[351,216],[352,239],[335,258]],
            [[439,604],[459,592],[475,608],[472,626],[451,635],[438,623]],
            [[535,608],[551,603],[567,617],[564,633],[548,641],[534,627]]],
  },
  'contact': {
   'cloth': [[[1100,495],[1134,514],[1169,548],[1213,570],[1270,586],[1256,585],[1304,598],[1350,604],[1388,626],[1416,655],[1372,639],[1403,668],[1425,696],[1445,739],[1445,1000],[1400,991],[1350,962],[1306,917],[1260,903],[1231,883],[1194,873],[1169,852],[1155,867],[1119,827],[1090,808],[1052,764],[1029,725],[1003,690],[994,654],[1011,622],[1039,597],[1065,581],[1094,568],[1107,548]],
             [[817,622],[841,631],[867,628],[883,612],[898,637],[906,667],[926,703],[945,730],[964,754],[989,789],[1004,818],[1030,860],[1004,851],[982,830],[973,833],[947,812],[927,796],[927,814],[902,788],[883,780],[869,764],[877,792],[850,775],[839,752],[828,756],[817,738],[807,723],[799,702],[796,681],[804,651]],
             [[755,680],[786,683],[794,704],[798,734],[807,759],[785,748],[778,732],[766,742],[759,714]]],
   'blade': [[[0,486],[779,486],[791,581],[0,581]]],
   'trim': [[[758,267],[762,225],[783,251],[814,157],[830,242],[854,190],[862,246],[900,230],[880,268],[906,281],[876,292],[845,290],[825,299],[790,302]],
            [[826,441],[842,419],[867,410],[891,421],[911,444],[922,481],[886,501],[849,488]],
            [[790,471],[807,460],[827,471],[827,508],[840,515],[831,538],[832,581],[838,599],[825,615],[806,607],[798,585],[807,575],[808,537],[795,518]],
            [[1074,518],[1098,508],[1120,531],[1091,555],[1074,543]],
            [[872,580],[888,574],[907,585],[909,602],[891,615],[876,605]]],
  },
 },
}

# Hard surfaces occlude the cloth at these source-pose boundaries.
MATERIAL_EXCLUSIONS = {
 'orbital_clockwork': {'ready': [
  [[884,509],[947,518],[975,531],[962,568],[922,583],[797,615],[826,578]],
  [[801,607],[925,598],[960,619],[959,656],[934,684],[884,699],[866,704],[806,665]],
  [[1150,541],[1197,556],[1240,588],[1278,624],[1198,603],[1168,575]],
  [[1190,619],[1261,647],[1311,683],[1280,727],[1250,750],[1213,724],[1177,658]],
 ]},
 'endking': {
  'ready': [
   [[590,607],[635,615],[686,643],[741,700],[694,705],[634,684],[606,659]],
   [[640,700],[707,722],[735,763],[729,800],[698,816],[665,781],[644,754]],
  ],
  'contact': [
   [[917,599],[965,609],[1026,642],[1069,686],[1011,685],[961,655],[935,632]],
   [[1010,684],[1061,716],[1090,758],[1080,796],[1043,817],[1012,775],[991,740]],
  ],
 },
}


def region_mask(size, polygons):
    mask = Image.new('1', size)
    draw = ImageDraw.Draw(mask)
    for poly in polygons:
        draw.polygon([tuple(p) for p in poly], fill=1)
    return np.array(mask, dtype=bool)


def material_map(rgba, base, role, identity=None):
    rgb = rgba[..., :3].astype(np.float32) / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hi, lo = rgb.max(axis=2), rgb.min(axis=2)
    saturation = (hi - lo) / np.maximum(hi, .001)
    warm = (r > b * 1.10) & (r > g * 1.04) & (saturation > .18)
    red = warm & (g < r * .66)
    cool = (b > r * 1.14) | ((g > r * 1.15) & (b > r * 1.05))
    labels = np.full(r.shape, 'metal', dtype='U8')
    if base == 'slime': labels[:] = 'gel'
    elif base == 'wraith': labels[:] = 'ghost'
    elif base == 'guardian': labels[:] = 'metal'
    elif base == 'sentinel':
        labels[warm] = 'trim'
        labels[cool & (saturation > .25)] = 'cloth'
    elif base == 'knight':
        labels[warm] = 'trim'
        labels[red] = 'cloth'
        # Rust is metal; retain readable silver on the long blade.
        yy, xx = np.indices(r.shape)
        labels[(yy < 330) & (xx > 930)] = 'blade'
        if role == 'plume': labels[:] = 'cloth'
    elif base == 'duelist':
        labels[red] = 'metal'
    elif base == 'cantor':
        labels[:] = 'cloth'
        labels[warm & (g > r * .65)] = 'trim'
    elif base == 'clockwork': labels[warm] = 'trim'
    elif base == 'timewarden':
        labels[warm] = 'trim'
        labels[cool & (saturation > .25)] = 'cloth'
    elif base == 'rogue':
        labels[cool & (saturation > .18)] = 'cloth'
        labels[red] = 'trim'
    for name, polygons in MATERIAL_REGIONS.get(identity, REGIONS.get(base, {})).get(role, {}).items():
        mask = region_mask((r.shape[1], r.shape[0]), polygons)
        # Duelist cloth is red; don't paint over silver blades/gauntlets inside
        # the broad cape region. Machinery cloth similarly excludes silver.
        if base == 'duelist': mask &= red
        if base == 'clockwork' and identity != 'orbital_clockwork': mask &= warm & (hi < .68)
        if name == 'cloth': mask &= ~region_mask((r.shape[1], r.shape[0]), MATERIAL_EXCLUSIONS.get(identity, {}).get(role, []))
        labels[mask] = name
    return labels


def recolour(source, base, role, identity):
    rgba = np.asarray(source.convert('RGBA'))
    labels = material_map(rgba, base, role, identity)
    rgb = rgba[..., :3].astype(np.float32)
    luminance = (rgb * np.array([.2126, .7152, .0722])).sum(axis=2) / 255
    # Keep ink unmodified. Colour ramps preserve shadow/highlight structure.
    ink = rgb.max(axis=2) < 43
    out = rgba.copy()
    for material, ramp in RAMPS[identity].items():
        selected = (labels == material) & ~ink & (rgba[..., 3] > 0)
        anchors = np.array([[int(c[i:i+2], 16) for i in (0, 2, 4)] for c in ramp])
        t = luminance[selected]
        # Broad authored ramps avoid flattening gold armour's dense midtones.
        values = np.stack([np.interp(t, [0, .48, .95], anchors[:, c]) for c in range(3)], axis=1)
        out[selected, :3] = np.rint(values).clip(0, 255).astype(np.uint8)
    out[rgba[..., 3] == 0, :3] = 0
    return Image.fromarray(out)


def main():
    encounters = json.loads(__import__('subprocess').check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./assets/encounters').all.filter(e=>e.palette)))"], cwd=ROOT, text=True, encoding='utf-8'))
    entries, original_hashes = [], {}
    sources = pixel.sources()
    pixel_manifest = json.loads((ROOT / 'assets/character-art/pixel-candidates/manifest.json').read_text(encoding='utf-8'))
    for enemy in encounters:
        identity, base = enemy['id'], enemy['sprite']
        assert identity in RAMPS
        group = []
        for f in [s for s in sources if s['id'] == base]:
            path = ROOT / 'assets' / f['source']
            original_hashes[f['source']] = pixel.sha(path)
            with Image.open(path) as src:
                if identity == 'endking':
                    # Accepted workshop export: the crown is armour and all
                    # authored cloth hems use the purple filter. Never rerun
                    # the earlier material guess over the user's painting.
                    with Image.open(ROOT / 'assets/character-art/approved/endking' / (f['role'] + '.png')) as painted:
                        image = painted.convert('RGBA')
                    assert image.size == src.size
                    assert image.getchannel('A').tobytes() == src.convert('RGBA').getchannel('A').tobytes()
                else:
                    image = src.convert('RGBA') if identity in RETAIN_ORIGINAL else recolour(src, base, f['role'], identity)
            group.append((f, image))
        files = []
        for f, image in group:
            entry = dict(source=f['source'], role=f['role'], width=image.width, height=image.height, sourceSha256=original_hashes[f['source']], variants={})
            if identity == 'endking':
                approved = ROOT / 'assets/character-art/approved/endking' / (f['role'] + '.png')
                entry['approvedSource'] = dict(source=approved.relative_to(ROOT / 'assets').as_posix(), sha256=pixel.sha(approved))
            files.append(entry)
        for style in ['original', *pixel.PROFILES]:
            settings = pixel.PROFILES.get(style)
            palette = pixel.shared_palette([pixel.low_resolution(im, settings['block']) for _, im in group], settings['colors']) if settings else None
            if settings and identity == 'endking':
                # The crown/guard occupy few pixels. Reserve their gold tones
                # so median-cut does not merge them into the grey steel ramp.
                values = palette.getpalette()
                slots = [i for i in reversed(range(settings['colors'])) if max(values[i*3:i*3+3]) > 60][:3]
                for slot, colour in zip(slots, RAMPS[identity]['trim']):
                    values[slot*3:slot*3+3] = [int(colour[i:i+2], 16) for i in (0, 2, 4)]
                palette.putpalette(values)
            for entry, (f, image) in zip(files, group):
                output = pixel.convert(image, settings['block'], palette)[0] if settings else image
                target = DEST / style / identity / Path(f['source']).name
                target.parent.mkdir(parents=True, exist_ok=True)
                if identity in RETAIN_ORIGINAL:
                    original = next(p for p in pixel_manifest['files'] if p['source'] == f['source'])
                    preserved = f['source'] if style == 'original' else original['variants'][style]['source']
                    shutil.copyfile(ROOT / 'assets' / preserved, target)
                else:
                    output.save(target, optimize=True)
                entry['variants'][style] = dict(source=target.relative_to(ROOT / 'assets').as_posix(), sha256=pixel.sha(target), bytes=target.stat().st_size)
        entries.append(dict(id=identity, base=base, name=enemy['name'], retainOriginalPalette=identity in RETAIN_ORIGINAL,
                            reviewStatus='original-approved' if identity in RETAIN_ORIGINAL else 'revised-review' if identity in REVISED else 'approved',
                            ramps={} if identity in RETAIN_ORIGINAL else RAMPS[identity], files=files))
        print(identity, ':', len(files) * 4, 'PNGs')
    assert all(pixel.sha(ROOT / 'assets' / path) == sha for path, sha in original_hashes.items())
    project = ROOT / 'assets/character-art/approved/endking/project.json'
    manifest = dict(version=1, status='fine-adopted', adoptedStyle='fine', method='offline material masks; approved king filter painting; shared pixel palette', profiles=pixel.PROFILES, characters=entries,
                    approvedKingProject=dict(source=project.relative_to(ROOT / 'assets').as_posix(), sha256=pixel.sha(project)))
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Small synchronously loaded mapping, no hashes/image data needed at runtime.
    client = {e['id']:dict(id=e['id'],base=e['base'],retainOriginalPalette=e['retainOriginalPalette'],files=[dict(source=f['source'], variants={s:v['source'] for s,v in f['variants'].items()}) for f in e['files']]) for e in entries}
    (ROOT / 'assets/palette-candidates.js').write_text('/* Generated palette asset map; gameplay adopts fine, other styles remain reviewable. */\nwindow.ParryPaletteCandidates='+json.dumps(client, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
    print('Verified originals unchanged; wrote 12-character manifest and review mapping')


if __name__ == '__main__':
    main()
