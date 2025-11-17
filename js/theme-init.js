(function(){
  try{
    var savedTheme = localStorage.getItem('selectedTheme');
    if(savedTheme){ document.body.className = savedTheme; }
  }catch(e){}
})();
