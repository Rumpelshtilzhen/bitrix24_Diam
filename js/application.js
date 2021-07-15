const global_fieldsMass = [];

function Application() {
	this.arListFields = {};
	this.listFields = '';
	this.arRes = false;
}

function PapaParse() {
	this.rowCount = 0;
	this.errorCount = 0;
	this.firstError;
	this.start,
	this.end,
	this.buildConfig = {
		delimiter: "",
		header: true,
		dynamicTyping: false,
		skipEmptyLines: true,
		preview: 0,
		step: undefined,
		encoding: "UTF-8",
		worker: false,
		comments: "",
		complete: this.completeFn,
		error: this.errorFn,
		download: false
	};
}

PapaParse.prototype = {
	now: ()	=>	(typeof window.performance !== 'undefined')	? window.performance.now()	: 0,
	errorFn: function(err, file)	{
		this.end = this.now;
		console.log("ERROR:", err, file);
		$('#sendData').attr('disabled', false);
	},
	completeFn: function(results)	{
		this.end = this.now;
	
		if (results && results.errors)	{
			if (results.errors)	{
				this.errorCount = results.errors.length;
				this.firstError = results.errors[0];
			}
			if (results.data && results.data.length > 0)	this.rowCount = results.data.length;
		}
		app.arRes = results.data;
		setTimeout(app.buildTable, 100, results.meta.fields);
	}
}

Application.prototype.onSelectList = function(id)	{
	this.params = {
		'IBLOCK_TYPE_ID': 'lists_socnet',
		'IBLOCK_ID': id
	}
	const params = this.params;
	
	BX24.init(function()	{
		BX24.callMethod(
			'lists.field.get',
			params,
			function(result)	{
				if	(result.error())	{
					alert("Error: " + result.error());
				}else	{
					const arListFields = app.arListFields = result.data();
					let listFields = '<select class="fieldFromList" rel="FORAUTOCHENGE"><option value=""></option>';
					
					for(let key in arListFields) {
						if (!arListFields.hasOwnProperty(key)) continue;
						listFields += "<option value='"+arListFields[key].FIELD_ID+"' rel='"+arListFields[key].TYPE+"' mult='"+arListFields[key].MULTIPLE+"' vals='"+JSON.stringify(arListFields[key].DISPLAY_VALUES_FORM)+"'>"+arListFields[key].NAME+"</option>";
					}
					app.listFields = listFields + "</select>";
					console.log(arListFields);
				}
			}
		);
		if(id == 43)	{
			$('#events_list').html('Отсортировать событие по городу:<br><input type="text"><p>Выберите событие: <select class="eventsList"><option value=""></option></select></p>');
			app.openChekEvent();
			$('#events_list input').bind('input', function()	{
				let city = $(this).val();
				$('#events_list select').html('<option value=""></option>');
				app.openChekEvent(city);
			});
		}else {
			$('#events_list').html("");
			app.loadDataFile();
		}
	});
}

Application.prototype.openChekEvent = function(city = "")	{
	const params = {
		'IBLOCK_TYPE_ID': 'lists_socnet',
		'IBLOCK_ID': 59,
		'ELEMENT_ORDER': { "ID": "DESC" },
		'FILTER': { "%PREVIEW_TEXT": city }
	};

	BX24.callMethod(
		'lists.element.get',
		params,
		function(result)	{
			if	(result.error())	{
				alert("Error: " + result.error());
			}else	{
				const arListEvents = result.data();
				console.log(arListEvents);
				let listEvents = '';
				
				for(let key in arListEvents) {
					if (!arListEvents.hasOwnProperty(key)) continue;
					listEvents += "<option value='"+arListEvents[key].ID+"'>"+arListEvents[key].NAME+"</option>";
				}

				$('#events_list select').append(listEvents);
			}
		}
	);
	this.loadDataFile();
}

Application.prototype.loadDataFile = function()	{
	$('input[type="file"]').change(function()	{
		if ($(this).attr('disabled') == "true")	return;

		parseCSV.rowCount = 0;
		parseCSV.errorCount = 0;
		parseCSV.firstError = undefined;
		
		// Allow only one parse at a time
		if (!$(this)[0].files.length)	{
			alert("Пожалуйста, выберите файл для загрузки.");
			return $('#sendData').attr('disabled', false);
		}

		$(this).parse({
			config: parseCSV.buildConfig,
			before: function(file, inputElem)	{
				$(this).attr('disabled', true);
				parseCSV.start = parseCSV.now();
				console.log("start: "+ parseCSV.start);
				//console.log("Parsing file...", file);
			},
			error: function(err, file)	{
				console.log("ERROR:", err, file);
				parseCSV.firstError = parseCSV.firstError || err;
				parseCSV.errorCount++;
			},
			complete: function()	{
				parseCSV.end = parseCSV.now();
				$(this).removeAttr('disabled');
				console.log("end: "+ parseCSV.end);
			}
		});
		$('.fields_select').show();
		setTimeout(app.eventListener, 300);
	});
}

Application.prototype.eventListener = function()	{
	$(".fieldFromList").change(function()	{
		const tableClassMerk = $(this).attr("rel");
		
		$(this).parent().children("table").remove();
	  $(".fieldFromList[rel='"+tableClassMerk+"'] option:selected").each(function() {
			app.buildListTable(this);
		});
	});

	sendData.onclick = function()	{
		const selectEvents = events_list.querySelector("select");
		
		if(!selectEvents)	{
			app.sendData();
		}else	{
			(!selectEvents.value)
			?	alert("Выберите мероприятие для загрузки списка участников")
			:	app.sendData();
		}
	}
}

Application.prototype.buildTable = function(arFields)	{
	$(".tableRows").html('');
	$(".tableRows").html('<table id="maneTable" cellpadding="10"><tr><th>Поле в CSV</th><th>Поле в списке</th></tr></table>');
		
	for(let key in arFields) {
		if (!arFields.hasOwnProperty(key)) continue;
		const listFieldsMod = app.listFields.replace('FORAUTOCHENGE',arFields[key]);

		$('#maneTable').append('<tr><td>'+arFields[key]+'</td><td>'+listFieldsMod+'</td></tr>');
		$('.fieldFromList[rel="'+arFields[key]+'"] option:contains("'+arFields[key]+'")')
			.prop('selected', true)
			.each(function() {	app.buildListTable(this);	});
	}
	app.ScrollSize();
}

Application.prototype.buildListTable = function(self)	{
	const field_type = $(self).attr("rel");

	if(field_type == "L")	{
		const arFieldListList = JSON.parse($(self).attr("vals"));
		let fieldSoTable = '<table cellpadding="10"><tr><th>Значение списка</th><th>Значение в csv</th></tr>';

		for(let key in arFieldListList) {
			if (!arFieldListList.hasOwnProperty(key)) continue;
			fieldSoTable += '<tr><td>'+arFieldListList[key]+'</td><td><input type="text" value="'+arFieldListList[key]+'" rel="'+$(self).attr("value")+'" name="var_'+key+'" placeholder="'+arFieldListList[key]+'" /></td></tr>';
		}
		fieldSoTable += '</table>';
		
		$(self).parent().parent().append(fieldSoTable);
	}
	app.ScrollSize();
}

Application.prototype.sendData = function()	{
	const addOrUpdElList = this.addOrUpdElList(),
				arRes = this.arRes;

	for(let k in arRes)	{
		if (arRes.hasOwnProperty(k))	{
			let prepareSending = this.prepareSending(arRes[k]);
			//console.dir(prepareSending);
			setTimeout(addOrUpdElList, 400, prepareSending);
		}
	}
}

Application.prototype.prepareSending = function(elementOfList)	{
	const fieldsMass = (function() {
		const selectEvents = $('#events_list>select option:selected');
		return (selectEvents)	?	{PROPERTY_337: $(selectEvents).attr("value")}	:	{};
	}());
	
	for(let k in elementOfList) {
		if (!elementOfList.hasOwnProperty(k)) continue;

		const fieldCode = $(".fieldFromList[rel='"+k+"']").val(),
					dataField = elementOfList[k],
					arVals = dataField.split(','),
					arAssocFVals = {},
					globfieldsMass = {};
		let mult = "", ftype = "";

		$(".fieldFromList[rel='"+k+"'] option:selected" ).each(function() {
			mult = $(this).attr("mult");
			ftype = $(this).attr("rel");
			console.log('k: '+k+', '+'fieldCode: '+fieldCode+', '+'ftype: '+ftype+', '+'mult: '+mult);
		});

		for(let val in arVals) {
			if (!arVals.hasOwnProperty(val)) continue;
			
			$("input[rel='"+fieldCode+"']").each(function()	{
				arAssocFVals[$(this).val()] = $(this).attr("name").replace("var_","");
			});
			console.log('dataField: '+dataField+', '+'arAssocFVals: '+JSON.stringify(arAssocFVals));
		}

		if(fieldCode != "")	{
			switch(ftype) {
				case "E":
					if(mult === "Y")	{
						const arThisAr = {};

						for(let val in arVals) {
							if (!arVals.hasOwnProperty(val)) continue;
							let valCell = !arAssocFVals[arVals[val]]
							? arVals[val]
							: arAssocFVals[arVals[val]];

							if(isNaN(valCell))	{

							}else	{
								arThisAr['n'+val] = valCell;
							}
							fieldsMass[fieldCode] = arThisAr;
						}
					}else	{
						let valCell = !arAssocFVals[dataField]
						? dataField
						: {'n0': arAssocFVals[dataField]};
						
						if(isNaN(valCell))	{

						}else	{
							fieldsMass[fieldCode] = valCell;
						}
					}
				 	break;
					
				case "E:EList":
				case "L":
					if(mult === "Y")	{
						const arThisAr = {};

						for(let val in arVals) {
							if (!arVals.hasOwnProperty(val)) continue;
							arThisAr['n'+val] = !arAssocFVals[arVals[val]]
							? arVals[val].trim()
							: arAssocFVals[arVals[val]].trim();
						}
						fieldsMass[fieldCode] = arThisAr;
					}else	{
						fieldsMass[fieldCode] = !arAssocFVals[dataField]
						? dataField
						: {'n0': arAssocFVals[dataField]};
					}
					break;

				case "S:ECrm":
				case "S:employee":
					const procTypeAPI = (ftype === "S:ECrm") ? 'crm.contact.list' : 'user.get';
					const params_Crm = {	select: [ "ID", "TYPE_ID" ]	};
					
					if(mult === "Y")	{
						const arThisAr = {};

						for(let val in arVals) {
							if (!arVals.hasOwnProperty(val)) continue;
							let valCell = !arAssocFVals[arVals[val]]
							? arVals[val]
							: arAssocFVals[arVals[val]];

							if(isNaN(valCell)) {
								params_Crm.filter = { "LAST_NAME": valCell };
								const params2 = (ftype === "S:ECrm") ? params_Crm : params_Crm.filter;
								
								BX24.callMethod(
									procTypeAPI,
									params2,
									function(result)	{
										if(result.error())	{
											console.log("Error: "+result.error());
											alert("Ошибка: "+result.error());
										}else	{
											arThisAr['n'+val] = result.data()[0].ID;
										}
									}
								);
							}else {	
								arThisAr['n'+val] = valCell;	
							}
						}
						fieldsMass[fieldCode] = arThisAr;
					}else	{
						let valCell = !arAssocFVals[dataField]
						? dataField
						: {'n0': arAssocFVals[dataField]};

						if(isNaN(valCell)) {
							params_Crm.filter = { "LAST_NAME": valCell };
							const params2 = (ftype === "S:ECrm") ? params_Crm : params_Crm.filter;
							
							BX24.callMethod(
								procTypeAPI,
								params2,
								function(result)	{
									if(result.error())	{
										console.log("Error: "+result.error());
										alert("Ошибка: "+result.error());
									}else	{
										fieldsMass[fieldCode] = result.data()[0].ID;
									}
								}
							);
						}else	{	
							fieldsMass[fieldCode] = valCell;	
						}
					}
					break;
				
				default:
						fieldsMass[fieldCode] = dataField;
			}
			Object.assign(globfieldsMass, fieldsMass);
			console.dir(globfieldsMass);
		}
	}

	return fieldsMass;
}

Application.prototype.addOrUpdElList = function()	{
	//var keyField = $(".unicField:radio:checked").attr("value");
	const params = this.params,
				ScrollSize = this.ScrollSize;
	let key = 0;
	
	return function(fieldsMass)	{
		//console.log(fieldsMass);
		key+=1;
		params['FIELDS'] = fieldsMass;
		params['ELEMENT_CODE'] = '2vgox4()';//app.genCode();
		
		BX24.callMethod(
			'lists.element.add',
			params,
			function(result)	{
				if(result.error())	{
					console.log("Error: "+result.error());
					$("#counter-upl").append("<p>Не добавлена запись: "+key+"</p>");
					ScrollSize();
					//alert("Ошибка: "+result.error());
				}else	{
					$("#counter-upl>p").html("Обработано записей: "+key);
					ScrollSize();
				}
			}
		);
	}
}

Application.prototype.saveFrameWidth = function () {
	this.FrameWidth = document.getElementById("app").offsetWidth;
}

Application.prototype.ScrollSize = function()	{
	const obSize = BX24.getScrollSize();
	minHeight = obSize.scrollHeight;
	
	if (minHeight < 400) minHeight = 400;
	BX24.resizeWindow(this.FrameWidth, minHeight);
}

Application.prototype.genCode = function() {
	const letters = '_0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.?!()$%';
	const lettersMass = [];

	for (let ltr = 0; ltr < 8; ltr++) {
		let randomLeter = Math.floor(Math.random()*70);
		lettersMass.push(letters[randomLeter]);
	}
	console.log(lettersMass.join(''));
	return lettersMass.join('');
}

const app = new Application();
const parseCSV = new PapaParse();
