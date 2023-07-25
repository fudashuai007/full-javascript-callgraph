

// function a(a){
//   // console.log(a);
// }


// function a(){
//   // console.log(1);
// }

// a(2)
// case 0
// const aa = function(){
//   function bb(){}
// }
// case1
// function a() {
// }

// const { assertAccessor } = require("@babel/types");

// case2
// function a() {
//   return () => { }
// }

// case3
// let p = {
//   c:assertAccessor,
//   obj: function () { },
//   11: function () { },
//   'a': function () { },
//   d: function cc(){}
// }
 
// case4
// (function(){})(function(){})
// !function () {
//   console.log(2123);
// }();
// ~(function(){ 
//   alert('water'); 
// })(function(){});//写法有点酷~ 
// void function(){ 
//   alert('water'); 
// }(function(){});//据说效率最高~ 
// (function f(c) {
//   c()
//   //代码块
// })(function(){})

// function a(){
  
// }

// a()

function main (b) {
	// console.log(args[]);
  // args[0]()
  b()
}

// function b(){}
main(function(){});
// let obj = {
//   aa:function(){}
// }

// obj.aa()
// assdasdasds(function(){})
// // case5
// aa.add(function(){})
//  az(cc(function(){}))
// // // case 6
// aa(function(){})(bb(function(){}))
// a.aa(function(){}).bb()
// aa().bb(cc(function(){}))
// aa(function(){})
// import a from './a'
// export default function(){}
// a()
// za.aa(function (){})
// function main () {
// 	const b = {'a': () => { return 1; } };
// 	const {a: foo} = b;
// 	foo();
// }
// [function(){},function a(){}]
// // case 7
// let obj ={
//   b:function a(){}
// }
// function toString(){}
// class P {
//   toString(){}
// }

// let p = new P()
// p.toString()



// @testable(function(){})
// class MyTestableClass {
//   // ...
// }

// case 8
// @frozen class Foo {
//   // @configurable(false)
//   // @enumerable(true)
//   // method() {}

//   // @throttle(500)
//   expensiveMethod() {}
// }
// @test()
// class P {}

// function main () {
// 	let a = function aa(){}
//   a = function(){}
// }

// main();

// let a = function aa(){} && function bb(){}
// let a = 'name'

// let ob= {
//   Array:{type:'native',name:'name'}
// }

// console.log(a in ob);
// (function(){})()
// (function(){
//   //代码块
// })();

// (function f() {
//   //代码块
// })()
// function a(){
//   (function(){
//     console.log(1);
//   })()
// }

// a()
// function a(){
//   let b = ()=>{console.log(1);}
//   b()
// }
// function a(){}
// a()
// let obj = {
//   a:function(){}
// }

// obj.a()
// case 9
// let aa = function b(cc){
//   cc(function(){})
//   // console.log(1);
// }
// function cc(as){
  // let cc= {
  //   bb:{
    
  //     cc:function(){ },
  //     dd:function(){}
  //   },
  //   cc:function(dd){
  //     console.log(11);
  //   },
  //   cc:function aa(gg){
  //     console.log(22);
  //   }
  // }
  // cc.cc()
// }
// bb(function(){})
// aa.bb(function(){}).cc(function(){})
// cc(function(){}).bb.cc(function(){})
// aa().bb(function(){}).cc(function(){})

// console.log(aa);

//case 10
// function main () {
// 	function cc(){}
// 	const a = [ (e) => { e() } ];
// 	let [b] = a;
// 	b(cc);
// }

// main();

// case 11
// const fun1 = require('./fun1')
// const fun2 = require('./fun2')
// fun1.aa()
// square(11); // 121
// diag(4, 3); // 5

// const {a,b} = require('lib')
// a()
// b()

// @test()
// class C {}

// class A {

//   where(cb) {
//     // this.data = this.data.filter(cb);
//     return this;
//   }

//   groupby(key) {
//     // const map = new Map();
//     // this.data.forEach((d) => {
//     //   if (map.has(d[key])) {
//     //     map.get(d[key]).push(d);
//     //   } else {
//     //     map.set(d[key], [d]);
//     //   }
//     // });

//     // this.data = Array.from(map.values());
//     return this;
//   }

//   excute() {
//     // console.log(this.data);
//   }
// }

// let a = new A()
// a.where(function(){}).groupby().excute()

