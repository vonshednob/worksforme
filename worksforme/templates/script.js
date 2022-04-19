/* boiler plate javascript
 */
var fn = {};

(function(){
let search_timer = null;
let sets = {};

fn.q = function(q, b=null) {
    if ( b === null ) { b = document; }
    return b.querySelector(q);
};

fn.m = function(t, o={}) {
    let e = document.createElement(t);
    for ( let k of Object.keys(o) ) {
        if ( k == 'class' ) {
            e.className = o[k];
        } else if ( k == 'innerText' ) {
            e.innerText = o[k];
        } else if ( k == 'innerHTML' ) {
            e.innerHTML = o[k];
        } else {
            e.setAttribute(k, o[k]);
        }
    }
    return e;
};

fn.title_case = function(text) {
    let result = '';
    let upper_next = true;
    for ( let idx = 0; idx < text.length; idx++ ) {
        let ch = text.substr(idx, 1);

        if ( upper_next ) {
            ch = ch.toLocaleUpperCase();
        }
        result += ch;

        if ( " \t  ".indexOf(ch) >= 0 ) {
            upper_next = true;
        } else {
            upper_next = false;
        }
    }
    return result;
};

load_sounds = function(data) {
    let sounds = data;
    let container = fn.q('#library');
    container.innerHTML = '';

    let sortable = [];
    Object.entries(sounds).forEach(p => {
        const id = p[0];
        const metadata = p[1];
        sortable.push(p)
    });
    sortable.sort((a, b) => a[1]['titles'][0].toLocaleLowerCase() > b[1]['titles'][0].toLocaleLowerCase());
    for ( let idx = 0; idx < sortable.length; idx+=1 ) {
        let id = sortable[idx][0];
        let metadata = sortable[idx][1];
        let card = fn.m('li', {'class': 'sound card', 'data-soundid': id});
        let btnplay = fn.m('button', {'class': 'once', 'innerText': '▶'});
        let btnloop = fn.m('button', {'class': 'loop', 'innerText': '↺'});
        let title = fn.m('h1');
        let titletext = fn.m('span', {'innerText': metadata['titles'][0]});
        let subtitle = fn.m('h2',
                            {'innerText': metadata['titles'].slice(1).concat(metadata['albums']).join(', ')});
        let len = fn.m('div', {'class': 'duration', 'innerText': metadata['length']});
        card.metadata = metadata;
        container.appendChild(card);
        title.appendChild(btnplay);
        title.appendChild(btnloop);
        title.appendChild(titletext);
        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(len);

        btnplay.onclick = function(ev) { start_play(id, metadata, 'once') };
        btnloop.onclick = function(ev) { start_play(id, metadata, 'loop') };
    }
};

load_sets = function(data) {
    sets = data;
    fill_sets();
};

fill_sets = function() {
    let container = fn.q('#sets');
    container.innerHTML = '';

    let sorted = [];
    Object.entries(sets).forEach(p => {
        sorted.push(p[0]);
    });
    sorted.sort();
    for ( let idx = 0; idx < sorted.length; idx+=1 ) {
        let name = sorted[idx];
        let soundset = sets[name];
        let card = fn.m('li', {'class': 'set card'});
        let title = fn.m('h1');
        let titletext = fn.m('span', {'innerText': name});
        let btnload = fn.m('button', {'class': 'load', 'innerText': '▶'});
        let btnadd = fn.m('button', {'class': 'add', 'innerText': '+'});
        let btndel = fn.m('button', {'class': 'delete', 'innerText': '×'});

        title.appendChild(btnload);
        title.appendChild(btnadd);
        title.appendChild(titletext);
        title.appendChild(btndel);
        card.appendChild(title);
        container.appendChild(card);

        btndel.onclick = function(ev) {
            delete sets[name];
            save_sets();
            card.parentElement.removeChild(card);
        };

        let add_set = function() {
            for ( let sdx = 0; sdx < soundset.length; sdx += 1 ) {
                let soundid = soundset[sdx]['soundid'];
                let volume = soundset[sdx]['volume'];
                let option = soundset[sdx]['kind'];
                let sound = null;
                for ( let child of fn.q('#library').children ) {
                    if ( child.getAttribute('data-soundid') === soundid ) {
                        sound = child;
                        break;
                    }
                }
                if ( sound === null ) {
                    continue;
                }

                let card = start_play(soundid, sound.metadata, option);
                fn.q('audio', card).volume = volume;
                fn.q('input', card).value = volume*100;
            }
        };

        btnadd.onclick = function(ev) {
            add_set();
        };
        btnload.onclick = function(ev) {
            stop_all_sounds();
            add_set();
        };
    }
};


stop_all_sounds = function() {
    fn.q('#sounds').innerHTML = '';
};

save_as_set = function(ev) {
    let name = fn.q('#set_name').value;
    if ( name.length == 0 ) {
        return;
    }
    let container = fn.q('#sounds');
    let sounds = [];
    for ( let idx = 0; idx < container.children.length; idx += 1 ) {
        let card = container.children[idx];
        let soundid = card.getAttribute('data-soundid');
        let volume = fn.q('audio', card).volume;
        let kind = 'once';
        if ( card.classList.contains('loop') ) { kind = 'loop' }

        sounds.push({'soundid': soundid,
                     'volume': volume,
                     'kind': kind});
    }

    if ( sounds.length > 0 ) {
        sets[name] = sounds;
        save_sets();
        fill_sets();
        fn.q('#set_name').value = '';
    }
};

save_sets = function() {
    fetch('save', {
        'method': 'POST',
        'headers': {'Content-Type': 'application/json'},
        'body': JSON.stringify(sets)
    });
};

start_play = function(soundid, meta, option) {
    let container = fn.q('#sounds');
    let sound = fn.m('div', {'class': 'card player ' + option, 'data-soundid': soundid});
    let audio = fn.m('audio', {});
    if ( option === 'loop' ) { audio.setAttribute('loop', 'loop') }

    audio.innerHTML = '<source src="sound/' + soundid + '">';
    sound.appendChild(audio);

    let title = fn.m('span', {'innerText': meta['titles'][0]});
    sound.appendChild(title);

    let volume = fn.m('input', {'type': 'range', 'min': '0', 'max': '100'});
    sound.appendChild(volume);

    let btnkill = fn.m('button', {'innerText': '×'});
    sound.appendChild(btnkill);
    container.appendChild(sound);

    volume.value = fn.q('#basevolume').value;
    audio.volume = volume.value / 100.0;
    audio.oncanplaythrough = function(ev){ ev.target.play() };
    btnkill.onclick = function(ev){ container.removeChild(sound) };
    volume.onchange = function(ev){ audio.volume = volume.value / 100.0 };
    if ( option === 'once' ) {
        audio.onended = function(ev){ container.removeChild(sound) };
    }

    return sound;
};

start_timeout = function(ev) {
    if ( search_timer !== null ) {
        clearTimeout(search_timer);
    }
    search_timer = setTimeout(apply_search, 250);
};

apply_search = function() {
    if ( search_timer !== null ) {
        clearTimeout(search_timer);
        search_timer = null;
    }

    let to_hide = [];
    let to_show = [];
    let container = fn.q('#sidebar ul');
    let searchterms = fn.q('#searchbar').value.split(' ');
    for ( let idx = 0; idx < container.children.length; idx+=1 ) {
        let found_all = true;
        let element = container.children[idx];
        for ( let sdx = 0; sdx < searchterms.length; sdx += 1 ) {
            if ( element.metadata['search'].indexOf(searchterms[sdx]) < 0 ) {
                found_all = false;
                break;
            }
        }

        if ( found_all ) {
            to_show.push(element);
        } else {
            to_hide.push(element);
        }
    }

    to_hide.forEach(element => element.classList.add('hide'));
    to_show.forEach(element => element.classList.remove('hide'));
};

window.onload = function() {
    fetch('sounds.json').then(response => response.json()).then(data => load_sounds(data));
    fetch('sets.json').then(response => response.json()).then(data => load_sets(data));
    fn.q('#searchbar').focus();
    fn.q('#searchbar').onkeyup = start_timeout;
    fn.q('#btnsaveset').onclick = save_as_set;
    fn.q('#btnclear').onclick = stop_all_sounds;
};

})();
