document.querySelectorAll('a.pronunciation').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    var audio = new Audio(link.href);
    audio.play();
    link.classList.add('pronunciation--playing');
    audio.addEventListener('ended', function() {
      link.classList.remove('pronunciation--playing');
    });
  });
});
