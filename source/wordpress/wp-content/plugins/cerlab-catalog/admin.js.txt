document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('#cerlab-gallery-ids');
  const preview = document.querySelector('#cerlab-gallery-preview');
  document.querySelector('#cerlab-gallery-select')?.addEventListener('click', () => {
    const frame = wp.media({title:'Фотографии товара', button:{text:'Использовать фотографии'}, library:{type:'image'}, multiple:true});
    frame.on('open', () => input.value.split(',').filter(Boolean).forEach(id => frame.state().get('selection').add(wp.media.attachment(Number(id)))));
    frame.on('select', () => {
      const images = frame.state().get('selection').toJSON();
      input.value = images.map(image => image.id).join(',');
      preview.replaceChildren(...images.map(image => {
        const img = document.createElement('img');
        img.src = image.sizes?.thumbnail?.url || image.url;
        img.alt = image.alt || image.title;
        img.width = 100;
        return img;
      }));
    });
    frame.open();
  });
  document.querySelector('#cerlab-gallery-clear')?.addEventListener('click', () => {input.value='';preview.replaceChildren();});
});
