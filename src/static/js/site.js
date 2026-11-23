var isiPad;
jQuery(function($) {

	isiPad = navigator.userAgent.match(/iPad/i) != null;
	var isiPhone = navigator.userAgent.match(/iPhone/i) != null;
	var isAndroid = navigator.userAgent.match(/Android/i) != null;
	
	//if (isiPad || isiPhone || isAndroid) $('body').addClass('mobile-device');
	
	// LOGINBOX
	$('.login-link a, a.login-link, #lyv-loginbox-background, .login-btn, .login-needed, .login-need').click(function(e) {
		$(document.body).toggleClass('loginbox');
		e.preventDefault();
	});
		
	
	$('#lyv-popupbox-background, .close-popup').click(function(e) {
		$(document.body).removeClass('popupbox');
		e.preventDefault();
	});
	
	
	$('#happyvoting-popup .close, #happyvoting .close-link').click(function(e) {
		$(document.body).toggleClass('happyvoting-popup-open');
		$('#happyvoting-popup').remove();
		e.preventDefault();
	});

	
	if (isiPad) {
		
		$('#lyv-loginbox-background .row').click(function(e) {
			$(document.body).toggleClass('loginbox');
			e.preventDefault();
		});

	}
	
	
	$.each($('form[data-validate]'),function(index,form) {
		
		$(form).validate({
			ignore: ":disabled",
			showErrors:function(errors,errorList) {
				
				this.defaultShowErrors();
			
			},
			errorPlacement: function(error, element) {
				
				return false;
					
			},
			
			highlight:function(element, errorClass) {
				
				$(element).parent('.field').removeClass('success').addClass('danger');	
				
			},
			unhighlight:function(element, errorClass) {
				$element = $(element).parent('.field');
				
				if ($element.hasClass('danger')) {
					$element.removeClass('danger').addClass('success');
					setTimeout(function() {
						$element.removeClass('success');
					}, 2400);
				}
				
			}
			
			
		});
		
	})
	
	
	$('.select-nav').change(function(evt) {		
		window.location = $(this).val();
				
	});
	
	$('#topicStarter').submit(function(evt) {
		
		/*
		var data = $(this).serialize();
		console.log(data);
		
		$.ajax({
		  type: "POST",
		  url: $(this).attr('action'),
		  data: data,
		  success: function(a,b,c) {


		  },
		  dataType: 'html'
		});

		
		
		evt.preventDefault();*/
		
	});
	
	
	
	
	/* CUSTOM LYV SELECT BOX */
	
	$('.lyv-select-box').addClass('lyv-select-box-open')
	$.each($('.lyv-option-box'), function() {
		
		//if ($(this).find('ul').height()>200)
			$(this).find('.lyv-option-box-arrow').css({bottom:(-$(this).find('ul').height()+40)});
		//else	
			//$(this).find('.lyv-option-box-arrow').remove();	
		
	});
	$('.lyv-select-box').removeClass('lyv-select-box-open')
	
	$(document.body).on('click', '.lyv-select-box a.lyv-display-box', function(evt) {
		
		if (!$(this).parents('.lyv-select-box').hasClass('lyv-select-box-open')) $('.lyv-select-box').removeClass('lyv-select-box-open');
		$(this).parents('.lyv-select-box').toggleClass('lyv-select-box-open');
		evt.preventDefault();
		
	});

	$('.lyv-select-box .lyv-option-box li a').click(function(evt) {
		var $this = $(this);
		var $select = $(this).parents('.lyv-select-box');
		
		$select.removeClass('lyv-select-box-open');
		$select.find('a.lyv-display-box span').text($this.text())
		$select.find('.lyv-select-value').val($this.attr('data-value'))
		
		$select.find('li').removeClass('selected')
		$this.parents('li').addClass('selected');
		
		
		evt.stopPropagation();
		evt.preventDefault();
	});
	
	$('#myIssueLink a').click(function(evt) {
        
		var target = "#"+$(this).attr('href').split("#")[1]
		$('html, body').animate({
				scrollTop: $(target).position().top-290, //560
			}, 600);			
		
		evt.preventDefault();
		
    });
	
	$('#castYourVote').click(function(evt) {
		$('body').animate({
			scrollTop:$('#cast-your-vote').position().top-120
		});
		evt.preventDefault();
	});
	
	$(window).scroll(function() {
		if ($('#cast-your-vote') && $('#cast-your-vote').position() && $('#cast-your-vote').position().top-$('body').scrollTop() < 600) $('body').addClass('hideCastVoteWidget');
		else $('body').removeClass('hideCastVoteWidget')
		
	});
	
	
	/* FIX IPAD IPHONE ISSUE WITH GUMBY */
	if (isiPad || isiPhone)
	{
		$("a.toggle").click(function () { 
			$(this).toggleClass('active');
			$($(this).attr('gumby-trigger')).toggleClass('active');
		
		});			
	}
	
	$('.topic-delete-link').click(function(evt) {
		if (!confirm('Are you sure you want to delete this item?')) evt.preventDefault();
	})
	
	
	
});