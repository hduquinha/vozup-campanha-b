(function(){
  function initVideo(){
    const container = document.querySelector('[data-video-container]');
    if(!container) return;

    const videoUrl = (container.dataset.videoUrl || '').trim();
    const playBtn = container.querySelector('.video-play-btn');

    if(!videoUrl){
      container.classList.add('video--pending');
      if(playBtn) playBtn.setAttribute('aria-disabled','true');
      return;
    }

    function load(){
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
      container.innerHTML = ytMatch
        ? `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0" title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
        : `<video src="${videoUrl}" controls autoplay playsinline></video>`;
      container.classList.add('video--playing');
    }

    container.addEventListener('click', load, { once: true });
  }

  function initForm(){
    const form = document.getElementById('regForm');
    if(!form) return;

    const WHATSAPP_NUMBER = '551120901412';
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');
    const successBlock = document.getElementById('successBlock');
    const origem = form.dataset.origem || 'landing';
    const nomeEvento = form.dataset.nomeEvento || 'Captação VozUP';
    const apiEndpoint = window.FORM_CONFIG?.SERVER_URL || '/api/inscricao';

    function normalizeBrazilianPhone(value){
      let digits = String(value || '').replace(/\D+/g, '');
      // Alguns preenchimentos automáticos do iPhone incluem o país (55) ou
      // o prefixo internacional (0055). Removemos só quando há dígitos além
      // de um telefone brasileiro completo — DDD 55 continua sendo válido.
      if(digits.startsWith('0055')) digits = digits.slice(4);
      else if(digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
      return digits.slice(0, 11);
    }

    const telefoneInput = document.getElementById('telefone');
    if(telefoneInput){
      telefoneInput.addEventListener('input', function(){
        const d = normalizeBrazilianPhone(this.value);
        if(d.length > 10)      this.value = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
        else if(d.length > 6)  this.value = `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
        else if(d.length > 2)  this.value = `(${d.slice(0,2)}) ${d.slice(2)}`;
        else                   this.value = d ? `(${d}` : '';
      });
    }

    function clearErrors(){
      form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    }
    function setError(name, msg){
      const el = form.querySelector(`.field-error[data-for="${name}"]`);
      if(el) el.textContent = msg;
    }

    function validate(){
      clearErrors();
      let ok = true;
      const nome = form.nome.value.trim();
      if(!nome){ setError('nome','Campo obrigatório.'); ok=false; }
      else if(nome.split(/\s+/).filter(Boolean).length < 2){ setError('nome','Informe seu nome completo.'); ok=false; }

      const digits = normalizeBrazilianPhone(form.telefone.value);
      if(!digits){ setError('telefone','Campo obrigatório.'); ok=false; }
      else if(digits.length < 10 || digits.length > 11){ setError('telefone','Informe um número válido com DDD.'); ok=false; }
      return ok;
    }

    function toTitleCase(str){
      const lc = new Set(['da','de','do','das','dos','e','em','na','no','nas','nos']);
      return str.trim().toLowerCase().split(/\s+/).filter(Boolean)
        .map((w,i)=>(i>0&&lc.has(w))?w:w[0].toUpperCase()+w.slice(1)).join(' ');
    }

    function showWhatsAppCta(name){
      if(!successBlock) return;
      let link = successBlock.querySelector('.whatsapp-success-link');
      if(!link){
        link = document.createElement('a');
        link.className = 'whatsapp-success-link';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Chamar no WhatsApp';
        successBlock.appendChild(link);
      }
      const message = name
        ? `Olá! Meu nome é ${name}. Acabei de concluir meu cadastro e gostaria de falar com a equipe.`
        : 'Olá! Acabei de concluir meu cadastro e gostaria de falar com a equipe.';
      link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }

    function getClientId(){
      const k = `vozup:clientId:${origem}`;
      let id = sessionStorage.getItem(k);
      if(!id){
        id = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(k, id);
      }
      return id;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if(!validate()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      statusMsg.textContent = '';

      const payload = {
        nome: toTitleCase(form.nome.value),
        telefone: normalizeBrazilianPhone(form.telefone.value),
        nome_evento: nomeEvento,
        escola: 'VOZUP - Escola de Oratória e Inteligência Emocional',
        origem,
        clientId: getClientId(),
        timestamp: new Date().toISOString(),
        page: location.href,
        _final: true
      };

      try{
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('Falha');
        form.closest('.form-wrap').querySelector('.form-header').hidden = true;
        form.hidden = true;
        successBlock.classList.add('visible');
        showWhatsAppCta(payload.nome);
        sessionStorage.removeItem(`vozup:clientId:${origem}`);
      } catch(err){
        console.warn(err);
        statusMsg.textContent = 'Não foi possível enviar. Tente novamente.';
        statusMsg.style.color = '#f87171';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Garantir minha vaga';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initVideo();
    initForm();
  });
})();
