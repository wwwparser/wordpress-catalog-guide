(function (blocks, element, serverSideRender) {
  const titles = {header:'Шапка', footer:'Подвал', product:'Карточка товара', enquiry:'Форма заявки', categories:'Категории', products:'Товары', category:'Товары категории'};
  Object.entries(titles).forEach(([name, title]) => blocks.registerBlockType('cerlab/' + name, {
    apiVersion:3, title:'CERLAB: ' + title, category:'widgets', icon:'store',
    attributes:{group:{type:'string', default:'new'}},
    edit:props => element.createElement(serverSideRender.default || serverSideRender, {block:'cerlab/' + name, attributes:props.attributes}),
    save:() => null
  }));
})(window.wp.blocks, window.wp.element, window.wp.serverSideRender);
